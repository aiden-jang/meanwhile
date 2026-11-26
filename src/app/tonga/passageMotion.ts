import type { CameraState } from "../../globe/controlsTypes";
import type { PassageCamera } from "./passageSurface";
import { ORIGIN, START, ERUPTION, WAVE_ORIGIN, mix } from "./tongaTimeline";
import { honolulu } from "./honolulu";

export const DURATION = 8.1;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (v: number) => {
  const u = clamp01(v);
  return u * u * (3 - 2 * u);
};
export const between = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const logMix = (from: number, to: number, amount: number) => from * (to / from) ** amount;
const turn = (a: number, b: number) => a + (((b - a + 540) % 360) - 180);

export function composition(camera: PassageCamera, map: boolean) {
  const phone = innerWidth < 680;
  const close = { lon: ORIGIN.lon - (phone ? 0.92 : 1.85), lat: ORIGIN.lat - 0.05, zoom: map ? 2.2 : 2.1 };
  const wide = {
    lon: phone ? -167.9 : -182,
    lat: phone ? -13 : 1,
    zoom: map ? (phone ? 1.55 : 1.72) : phone ? 1.68 : 1.26,
  };
  const saved = camera.controls.state();
  camera.controls.setView(close);
  const east = camera.controls.project(ORIGIN.lon + 0.25, ORIGIN.lat, 1.005);
  const west = camera.controls.project(ORIGIN.lon - 0.25, ORIGIN.lat, 1.005);
  camera.controls.setView(saved);
  const pixels = east && west ? Math.abs(east.x - west.x) * 2 : 9;
  // Match a geographic field of view on both aspect ratios and both projections.
  const field = phone ? (map ? 5.4 : 3.9) : 12.3;
  const closeLens = Math.min(65, Math.max(1.8, innerWidth / (field * Math.max(1, pixels))));
  return { close, wide, closeLens, phone };
}

export function cue(t: number, chosen: number) {
  const approach = between(t, 0.06, 2.33);
  const across = between(t, 4.42, 7.55);
  const clock =
    t < 2.28
      ? mix(START, ERUPTION - 10, between(t, 1.0, 1.82))
      : t < 4.42
        ? mix(250, 320, clamp01((t - 2.28) / 2.14))
        : t < 7.55
          ? mix(320, honolulu.peak, clamp01((t - 4.42) / 3.13))
          : chosen;
  return {
    approach,
    across,
    minute: clock,
    archive: between(t, 0.16, 1.28) * (1 - between(t, 4.82, 6.83)),
    ink: between(t, 0.72, 1.58) * (1 - between(t, 4.68, 6.08)),
    wave: between(t, 4.42, 5.18) * Number(clock > WAVE_ORIGIN),
    trace: between(t, 7.17, DURATION),
    scanCaption: between(t, 1.38, 2.12) * (1 - between(t, 4.62, 5.22)),
    waveCaption: between(t, 4.77, 5.35) * (1 - between(t, 6.96, 7.65)),
    ready: t >= DURATION,
  };
}

export function frameShot(
  camera: PassageCamera,
  shot: ReturnType<typeof composition>,
  from: CameraState,
  t: number,
  sample: number,
) {
  const state = cue(t, sample);
  const { close, wide } = shot;
  const lon = mix(from.lon, turn(from.lon, close.lon), state.approach);
  const lat = mix(from.lat, close.lat, state.approach);
  const zoom = logMix(from.zoom, close.zoom, state.approach);
  const along = between(t, 4.7, 7.5);
  camera.controls.setView({
    lon: mix(lon, turn(lon, wide.lon), along),
    lat: mix(lat, wide.lat, along),
    zoom: logMix(zoom, wide.zoom, state.across),
  });
  camera.optics.magnification = logMix(1, shot.closeLens, between(t, 0.52, 2.62) * (1 - state.across));
  return state;
}
