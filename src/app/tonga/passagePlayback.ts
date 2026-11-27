import type { MutableRefObject } from "react";
import type { CameraState } from "../../globe/controlsTypes";
import type { StoryMoment } from "../observations/storyMoment";
import { createPassageSurface, preparePassage, type PassageCamera } from "./passageSurface";
import { between, composition, cue, DURATION, frameShot } from "./passageMotion";
import { honolulu } from "./honolulu";
import { ORIGIN, infrared, latestScan, pressureAt, timeIso, timeLabel } from "./tongaTimeline";
import { first, last, passageTrace } from "./passageTrace";

export interface PassageEvents {
  map: boolean;
  onMap: (value: boolean) => void;
  onInspect: (at: number) => void;
  onExplore: (minute: number, opener: HTMLElement) => void;
  onBack: () => void;
  remember: (part: Partial<StoryMoment>) => void;
}
export interface PassageActions {
  back(): void;
  skip(): void;
  replay(): void;
  inspect(): void;
  explore(opener: HTMLElement): void;
  sample(value: number): void;
}
export function attachPassage(
  stage: HTMLElement,
  camera: PassageCamera,
  origin: CameraState & { map: boolean },
  initial: StoryMoment | undefined,
  props: MutableRefObject<PassageEvents>,
  actions: MutableRefObject<PassageActions | undefined>,
) {
  const find = <T extends Element>(sel: string) => stage.querySelector<T>(sel)!;
  const back = find<HTMLButtonElement>(".passage-back");
  const skip = find<HTMLButtonElement>(".passage-skip");
  const replay = find<HTMLButtonElement>(".passage-replay");
  const track = find<HTMLElement>(".passage-track");
  const slider = find<HTMLInputElement>("input");
  const readout = find<HTMLElement>(".passage-reading");
  const caption = find<HTMLElement>(".passage-scan-caption");
  const waveCaption = find<HTMLElement>(".passage-wave-caption");
  const sensor = find<HTMLButtonElement>(".passage-sensor");
  const epicentre = find<HTMLElement>(".passage-origin");
  const amount = find<HTMLElement>(".passage-value");
  const stamp = find<HTMLElement>(".passage-clock");
  const waveClock = find<HTMLElement>(".passage-wave-caption time");
  const scanClock = find<HTMLElement>(".passage-scan-caption time");
  const trace = passageTrace(stage);
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  let shot = composition(camera, props.current.map);
  let projection = props.current.map,
    lastMorph = camera.controls.morph();
  let fittedPhone = false;
  let focusTrace = false;
  let frame = 0,
    canceled = false,
    previous = 0,
    closing = false,
    fast = false,
    scanReady = false;
  let depart: {
    from: CameraState;
    lens: number;
    time: number;
    minute: number;
    state: ReturnType<typeof cue>;
  } | null = null;
  let elapsed = initial?.chapter === "pressure" ? DURATION : 0,
    selected =
      elapsed === DURATION && initial?.at != null
        ? Math.max(first, Math.min(last, Math.round((initial.at - Date.parse(timeIso(0))) / 60000)))
        : honolulu.peak,
    previousReading = -1,
    storedReading = -1;
  const surface = createPassageSurface(camera);
  let trackBounds = track.getBoundingClientRect(),
    bounds = stage.getBoundingClientRect();
  let touchX: number | undefined,
    touchY: number | undefined,
    lastT = -1;
  const measure = () => {
    bounds = stage.getBoundingClientRect();
    trackBounds = track.getBoundingClientRect();
    if (elapsed === DURATION) draw(elapsed, true);
  };
  const observer = new ResizeObserver(measure);
  observer.observe(stage);
  observer.observe(track);
  const setOpacity = (el: Element, x: number) => {
    (el as HTMLElement).style.opacity = String(Math.max(0, x));
  };
  const label = (el: HTMLElement, p: { x: number; y: number } | null, visibility: number) => {
    el.style.opacity = String(p ? visibility : 0);
    if (p)
      el.style.transform =
        "translate(" + Math.round(p.x - bounds.left) + "px," + Math.round(p.y - bounds.top) + "px)";
  };
  function draw(t: number, force = false, rendered = false) {
    if (!fittedPhone && shot.phone && !projection && !closing && t >= 0.31 && t < 4.42) {
      // The closed phone sheet gives the orbital camera its full height after the first layout.
      shot = composition(camera, false);
      fittedPhone = true;
    }
    const frozen = t === DURATION && lastT === DURATION && !closing;
    let state = frozen || depart ? cue(t, selected) : frameShot(camera, shot, origin, t, selected);
    if (depart) {
      const q = between(depart.time, 0.1, 1.2);
      const turn = ((origin.lon - depart.from.lon + 540) % 360) - 180;
      camera.controls.setView({
        lon: depart.from.lon + turn * q,
        lat: depart.from.lat + (origin.lat - depart.from.lat) * q,
        zoom: depart.from.zoom * (origin.zoom / depart.from.zoom) ** q,
      });
      camera.optics.magnification = depart.lens ** (1 - q);
      state = {
        ...depart.state,
        ready: false,
        minute: depart.minute,
        trace: depart.state.trace * (1 - between(depart.time, 0, 0.42)),
        ink: depart.state.ink * (1 - q),
        archive: depart.state.archive * (1 - q),
        wave: depart.state.wave * (1 - between(depart.time, 0.12, 0.92)),
        scanCaption: 0,
        waveCaption: 0,
      };
    }
    const station = camera.controls.project(honolulu.lon, honolulu.lat, 1.008);
    const source = camera.controls.project(ORIGIN.lon, ORIGIN.lat, 1.006);
    const morph = camera.controls.morph();
    const stationMoved = station
      ? touchX === undefined ||
        touchY === undefined ||
        Math.abs(touchX - station.x) > 0.1 ||
        Math.abs(touchY - station.y) > 0.1
      : touchX !== undefined;
    if (
      !force &&
      frozen &&
      previousReading === selected &&
      !stationMoved &&
      morph === lastMorph &&
      !focusTrace
    )
      return;
    touchX = station?.x;
    touchY = station?.y;
    lastT = t;
    lastMorph = morph;
    previousReading = selected;
    surface.update(state.minute, state.archive, state.ink, state.wave);
    if (!rendered) camera.wake();
    stage.dataset.beat = state.ready ? "pressure" : t < 2.1 ? "approach" : t < 4.64 ? "satellite" : "wave";
    stage.dataset.minute = String(Math.floor(state.minute));
    stage.style.setProperty("--trace-reveal", state.trace.toFixed(3));
    setOpacity(caption, state.scanCaption);
    setOpacity(waveCaption, state.waveCaption);
    setOpacity(
      readout,
      depart ? depart.state.trace * (1 - between(depart.time, 0, 0.22)) : between(t, 7.36, 8.05),
    );
    const utc = timeLabel(state.minute);
    const at = infrared[latestScan(infrared, state.minute)]!;
    scanClock.textContent = timeLabel(at.minute) + " UTC";
    waveClock.textContent = utc + " UTC";
    label(epicentre, source, between(t, 5.45, 6.4) * (depart ? 1 - between(depart.time, 0.15, 0.8) : 1));
    label(sensor, station, between(t, 6.05, 6.83) * (depart ? 1 - between(depart.time, 0.16, 0.72) : 1));
    sensor.toggleAttribute("data-left", !!station && station.x > innerWidth - 97);
    sensor.disabled = t < 6.05 || closing;
    skip.hidden = state.ready || closing;
    replay.hidden = !state.ready || closing;
    readout.inert = !state.ready || closing;
    slider.disabled = !state.ready || closing;
    if (state.ready) {
      if (focusTrace) {
        slider.focus({ preventScroll: true });
        focusTrace = false;
      }
      const sample = pressureAt(honolulu, selected);
      const value = sample?.toFixed(2) ?? "—";
      amount.textContent = value;
      stamp.textContent = timeLabel(selected) + " UTC";
      slider.value = String(selected);
      slider.setAttribute(
        "aria-valuetext",
        timeLabel(selected) + " UTC · " + (sample === null ? "No sample" : value + " hPa"),
      );
      if (storedReading !== selected) {
        storedReading = selected;
        props.current.remember({
          id: "tonga",
          chapter: "pressure",
          choice: honolulu.id,
          at: Date.parse(timeIso(selected)),
        });
      }
    }
    trace(state.trace, selected, station, bounds, trackBounds);
  }
  function tick(now: number) {
    frame = 0;
    if (canceled || document.hidden) return;
    if (projection !== props.current.map) {
      projection = props.current.map;
      if (elapsed < DURATION) shot = composition(camera, projection);
    }
    const dt = previous ? Math.max(0, (now - previous) / 1000) : 0;
    previous = now;
    if (closing) {
      if (depart) depart.time += dt;
      if (!depart || depart.time >= 1.2) {
        camera.optics.magnification = 1;
        camera.controls.setView(origin);
        camera.wake();
        props.current.onBack();
        return;
      }
    } else if (scanReady || fast || reduced.matches) {
      elapsed = reduced.matches ? DURATION : Math.min(DURATION, elapsed + dt * (fast ? 4 : 1));
    }
    draw(elapsed);
    if (closing || (elapsed < DURATION && (scanReady || fast || reduced.matches))) schedule();
  }
  function schedule() {
    if (!frame && !document.hidden && !canceled) frame = requestAnimationFrame(tick);
  }
  const followCamera = () => {
    if (elapsed === DURATION && !closing) draw(elapsed, false, true);
  };
  camera.afterRender.add(followCamera);
  actions.current = {
    back() {
      if (closing) return;
      closing = true;
      fast = false;
      depart = {
        from: camera.controls.state(),
        lens: camera.optics.magnification,
        time: 0,
        minute: cue(elapsed, selected).minute,
        state: cue(elapsed, selected),
      };
      if (props.current.map !== origin.map) props.current.onMap(origin.map);
      if (elapsed < 0.05 || reduced.matches) {
        cancelAnimationFrame(frame);
        props.current.onBack();
        return;
      }
      stage.dataset.returning = "true";
      previous = 0;
      schedule();
    },
    skip() {
      if (closing) return;
      focusTrace = true;
      fast = true;
      if (elapsed < 6.9) elapsed = 6.9;
      schedule();
    },
    inspect() {
      if (!closing && elapsed === DURATION) props.current.onInspect(Date.parse(timeIso(selected)));
    },
    explore(opener) {
      if (!closing && elapsed === DURATION) props.current.onExplore(selected, opener);
    },
    sample(v) {
      selected = Math.max(first, Math.min(last, Math.round(v)));
      draw(elapsed, true);
    },
    replay() {
      if (closing) return;
      previous = 0;
      schedule();
      selected = honolulu.peak;
      fast = false;
      fittedPhone = false;
      elapsed = 0;
      previousReading = -1;
      back.focus({ preventScroll: true });
    },
  };
  const escape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      actions.current?.back();
    }
  };
  document.addEventListener("keydown", escape, true);
  const visibility = () => {
    previous = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  };
  document.addEventListener("visibilitychange", visibility);
  back.focus({ preventScroll: true });
  void preparePassage()
    .then((scan) => {
      if (canceled) return;
      surface.setScan(scan);
      scanReady = true;
      stage.dataset.loaded = "true";
      previous = 0;
      schedule();
      draw(elapsed, true);
    })
    .catch(() => {
      if (canceled) return;
      stage.dataset.scanMissing = "true";
      scanReady = true;
      elapsed = DURATION;
      draw(elapsed, true);
    });
  draw(elapsed, true);
  schedule();
  return () => {
    canceled = true;
    camera.afterRender.delete(followCamera);
    cancelAnimationFrame(frame);
    observer.disconnect();
    surface.detach();
    camera.optics.magnification = 1;
    camera.wake();
    document.removeEventListener("keydown", escape, true);
    document.removeEventListener("visibilitychange", visibility);
  };
}
