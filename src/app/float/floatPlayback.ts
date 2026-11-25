import type { CameraState } from "../../globe/controlsTypes";
import type { ArgoProfile } from "../../sources/argo";
import type { ProfileField } from "./profileGeometry";

const ASCENT_SECONDS = 10.5;

export interface FloatReading {
  index: number;
  playing: boolean;
  inspecting: boolean;
  stage: "locate" | "rise" | "notice";
  field: ProfileField;
}

export interface FloatCheckpoint {
  profile: ArgoProfile;
  source: "recent" | "recorded";
  reading: FloatReading;
  depth: number;
  target: CameraState;
}

export type FloatRestore = Pick<FloatReading, "stage" | "field" | "inspecting"> & { depth: number };

export type FloatDiveView = ReturnType<typeof createFloatPlayback>;

function nearestSample(samples: ArgoProfile["samples"], depth: number) {
  let low = 0;
  let high = samples.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (samples[middle]!.depth > depth) low = middle + 1;
    else high = middle;
  }
  return low > 0 && samples[low - 1]!.depth - depth < depth - samples[low]!.depth ? low - 1 : low;
}

export function createFloatPlayback(
  profile: ArgoProfile,
  autoplay: boolean,
  source: "recent" | "recorded",
  saved?: FloatCheckpoint,
) {
  const listeners = new Set<() => void>();
  const samples = profile.samples;
  const deepest = samples[0]!.depth;
  const shallowest = samples.at(-1)!.depth;
  const span = deepest - shallowest;
  let current: FloatReading = saved
    ? { ...saved.reading, playing: false }
    : { index: 0, playing: autoplay, inspecting: false, stage: "rise", field: "temperature" };
  let depth = saved?.depth ?? samples[current.index]!.depth;
  let destination: CameraState | undefined;
  let fold: (() => void) | undefined;

  function update(index: number, playing: boolean, changes: Partial<FloatReading> = {}) {
    const next = { ...current, index, playing, ...changes };
    if (
      Object.keys(next).every((key) => next[key as keyof FloatReading] === current[key as keyof FloatReading])
    )
      return;
    current = next;
    for (const listener of listeners) listener();
  }

  function seek(index: number) {
    if (!Number.isFinite(index)) return;
    const selected = Math.max(0, Math.min(samples.length - 1, Math.round(index)));
    depth = samples[selected]!.depth;
    update(selected, false, { stage: selected === samples.length - 1 ? "notice" : "rise" });
  }

  return {
    kind: "float-dive" as const,
    profile,
    source,
    target: saved?.target ?? { lon: profile.lon, lat: profile.lat, zoom: 1.35 },
    checkpoint(target: CameraState): FloatCheckpoint {
      return { profile, source, reading: current, depth, target };
    },
    depth: () => depth,
    depart: (camera: CameraState) => {
      destination = camera;
    },
    takeDestination() {
      const camera = destination;
      destination = undefined;
      return camera;
    },
    foldToSurface(complete: () => void) {
      update(current.index, false, { inspecting: false });
      fold = complete;
    },
    takeFold() {
      const complete = fold;
      fold = undefined;
      return complete;
    },
    read: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    seek,
    scrubDepth(requested: number, settle = false) {
      if (!Number.isFinite(requested)) return;
      const clamped = Math.max(shallowest, Math.min(deepest, requested));
      const index = nearestSample(samples, clamped);
      depth = settle ? samples[index]!.depth : clamped;
      update(index, false, { stage: "rise" });
    },
    setField(field: ProfileField) {
      update(current.index, current.playing, { field });
    },
    inspect(inspecting: boolean) {
      update(current.index, inspecting ? false : current.playing, { inspecting });
    },
    locate() {
      update(current.index, false, { stage: "locate", inspecting: false });
    },
    rise() {
      update(current.index, false, { stage: "rise" });
    },
    notice() {
      seek(samples.length - 1);
      update(current.index, false, { stage: "notice", inspecting: false });
    },
    pause: () => update(current.index, false),
    toggle() {
      if (current.playing) update(current.index, false);
      else {
        if (current.index === samples.length - 1) seek(0);
        update(current.index, true, { stage: "rise" });
      }
    },
    step(dt: number) {
      if (!current.playing) return false;
      depth = Math.max(shallowest, depth - (dt / ASCENT_SECONDS) * span);
      let next = current.index;
      while (next < samples.length - 1 && samples[next + 1]!.depth >= depth) next++;
      update(next, depth > shallowest, { stage: depth > shallowest ? "rise" : "notice" });
      return current.playing;
    },
  };
}
