import { spanDeg } from "../geo/sphere";
import { LAT_LIMIT } from "./framing";

export interface CameraPose {
  lon: number;
  lat: number;
  zoom: number;
}
export interface CameraTarget extends CameraPose {
  arc?: { span: number; pull: number; fromZoom: number };
  intro?: { elapsed: number; from: CameraPose };
  crossing?: { elapsed: number; from: CameraPose };
}
const INTRO_SECONDS = 2.2;
const clamp = (n: number): number => Math.max(0, Math.min(1, n));

export function cameraDestination(from: CameraPose, to: CameraPose, crossing: boolean): CameraTarget {
  const span = spanDeg(from.lon, from.lat, to.lon, to.lat);
  if (crossing && span >= 24) return { ...to, crossing: { elapsed: 0, from } };
  const pull = 0.45 * clamp((span - 25) / (110 - 25));
  return pull > 0 ? { ...to, arc: { span, pull, fromZoom: from.zoom } } : to;
}

export function entranceFrom(to: CameraPose): CameraPose {
  return {
    lon: to.lon - 68,
    lat: Math.max(-LAT_LIMIT, Math.min(LAT_LIMIT, to.lat - 18)),
    zoom: Math.min(3, Math.max(to.zoom, to.zoom * 2.1)),
  };
}

export function entrancePose(to: CameraTarget, dt: number): CameraPose {
  const intro = to.intro!;
  intro.elapsed = Math.min(INTRO_SECONDS, intro.elapsed + dt);
  const t = intro.elapsed / INTRO_SECONDS;
  const ease = t * t * (3 - 2 * t);
  return {
    lon: intro.from.lon + (to.lon - intro.from.lon) * ease,
    lat: intro.from.lat + (to.lat - intro.from.lat) * ease,
    zoom: intro.from.zoom + (to.zoom - intro.from.zoom) * ease,
  };
}

const CROSSING_SECONDS = 1.9;

export function crossingPose(to: CameraTarget, dt: number): CameraPose {
  const crossing = to.crossing!;
  crossing.elapsed = Math.min(CROSSING_SECONDS, crossing.elapsed + dt);
  const t = crossing.elapsed / CROSSING_SECONDS;
  if (t >= 1) return { lon: to.lon, lat: to.lat, zoom: to.zoom };
  const smooth = (n: number) => n * n * (3 - 2 * n);
  const along = smooth(clamp((t - 0.14) / 0.72));
  const from = crossing.from;
  let turn = to.lon - from.lon;
  turn -= Math.round(turn / 360) * 360;
  const overview = Math.min(0.85, from.zoom, to.zoom);
  const zoom =
    t < 0.38
      ? from.zoom + (overview - from.zoom) * smooth(t / 0.38)
      : overview + (to.zoom - overview) * smooth(clamp((t - 0.59) / 0.41));
  return {
    lon: from.lon + turn * along,
    lat: from.lat + (to.lat - from.lat) * along,
    zoom,
  };
}

export function crossingDone(to: CameraTarget): boolean {
  return !!to.crossing && to.crossing.elapsed >= CROSSING_SECONDS;
}

export function cameraRigTarget(to: CameraTarget | null, at: CameraPose): { bank: number; lift: number } {
  if (to?.intro) {
    const t = clamp(to.intro.elapsed / INTRO_SECONDS);
    const fade = 1 - t * t * (3 - 2 * t);
    return { bank: fade ? -0.15 * fade : 0, lift: 0.9 * fade ** 1.5 };
  }
  if (!to?.arc) return { bank: 0, lift: 0 };
  const progress = clamp(1 - spanDeg(at.lon, at.lat, to.lon, to.lat) / to.arc.span);
  let turn = to.lon - at.lon;
  turn -= Math.round(turn / 360) * 360;
  return { bank: Math.sign(turn) * Math.sin(Math.PI * progress) * 0.085, lift: 0 };
}

export function entranceDone(to: CameraTarget): boolean {
  return !!to.intro && to.intro.elapsed >= INTRO_SECONDS;
}

// Fixed slices preserve the critically damped flight across fast and slow displays.
export function advanceCameraSpring(
  at: CameraPose,
  velocity: CameraPose,
  to: CameraTarget,
  dt: number,
  clampZoom: (z: number) => number,
): boolean {
  const slices = Math.min(64, Math.max(1, Math.ceil(dt * 120)));
  const h = dt / slices;
  for (let i = 0; i < slices; i++) {
    let shortest = to.lon - at.lon;
    shortest -= Math.round(shortest / 360) * 360;
    const acc = (gap: number, speed: number): number => 100 * gap - 20 * speed;
    velocity.lon += acc(shortest, velocity.lon) * h;
    velocity.lat += acc(to.lat - at.lat, velocity.lat) * h;
    at.lon += velocity.lon * h;
    at.lat += velocity.lat * h;
    if (to.arc) {
      const { span, pull, fromZoom } = to.arc;
      const progress = clamp(1 - spanDeg(at.lon, at.lat, to.lon, to.lat) / span);
      at.zoom = clampZoom(
        (fromZoom + (to.zoom - fromZoom) * progress) / (1 + pull * Math.sin(Math.PI * progress)),
      );
      velocity.zoom = 0;
    } else {
      velocity.zoom += acc(to.zoom - at.zoom, velocity.zoom) * h;
      at.zoom += velocity.zoom * h;
    }
    // Arc zoom derives from geographic progress, so only non-arc flights use its own settle threshold.
    if (
      Math.abs(shortest) < 0.05 &&
      Math.abs(to.lat - at.lat) < 0.05 &&
      (to.arc || Math.abs(to.zoom - at.zoom) < 0.001) &&
      Math.abs(velocity.lon) < 0.5 &&
      Math.abs(velocity.lat) < 0.5
    ) {
      at.lon = to.lon;
      at.lat = to.lat;
      at.zoom = to.zoom;
      velocity.lon = velocity.lat = velocity.zoom = 0;
      return false;
    }
  }
  return true;
}
