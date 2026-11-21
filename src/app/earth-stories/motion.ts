import type { EarthStoryId } from "./catalogue";
import type { CameraState } from "../../globe/controls";
import type { ReplayCamera } from "../observations/types";
import { seafloorFlight, sectionPoint } from "./terrainSection";

export function storyCamera(
  id: EarthStoryId,
  target: CameraState,
  progress: number,
  coastalTarget?: CameraState,
): ReplayCamera {
  const p = Math.min(1, Math.max(0, progress));
  const settle = 1 - (1 - p) ** 3;
  const bank = Math.sin(p * Math.PI);
  if (id === "seafloor") {
    const point = sectionPoint(seafloorFlight, p);
    const approach = Math.min(1, Math.max(0, (p - 0.73) / 0.21));
    const widen = approach * approach * (3 - 2 * approach);
    return {
      lon: point.lon + (target.lon - point.lon) * widen,
      lat: point.lat + (target.lat - point.lat) * widen - 1.15 * bank,
      zoom: 1.65 + 0.5 * bank - 0.4 * widen,
      bank: -0.045 * bank,
      pitch: 0.16 * bank,
    };
  }
  if (id === "glacier")
    return {
      ...target,
      lon: target.lon + 0.24 * bank - 0.18 * settle,
      lat: target.lat + 0.065 * bank,
      zoom: target.zoom + 0.16 * bank,
      bank: -0.032 * bank,
      pitch: 0.08 * bank,
    };
  if (id === "aral") return { ...target, lon: target.lon + 0.35 * (1 - settle), bank: 0.025 * bank };
  if (coastalTarget)
    return {
      lon: target.lon + (coastalTarget.lon - target.lon) * settle,
      lat: target.lat + (coastalTarget.lat - target.lat) * settle + bank * 1.8,
      zoom: target.zoom + (coastalTarget.zoom - target.zoom) * settle,
      bank: -0.09 * bank,
      pitch: 0.14 * bank,
    };
  if (id === "spring")
    return {
      ...target,
      lon: target.lon + 25 * bank,
      lat: -24 * Math.cos(p * Math.PI * 2),
      bank: 0.05 * bank,
    };
  if (id === "dust")
    return {
      lon: -24 - 55 * (p * p * (3 - 2 * p)),
      lat: 21 + 2 * bank,
      zoom: 1.35 + 0.25 * p + 0.16 * bank,
      bank: -0.08 * bank,
      pitch: 0.12 * bank,
    };
  if (id === "ice" || id === "north")
    return {
      ...target,
      lon: target.lon + 26 * (1 - settle),
      lat: 68 + 8 * settle,
      bank: 0.09 * bank,
      pitch: 0.07 * bank,
    };
  if (id === "ozone")
    return { ...target, lon: target.lon - 22 * (1 - settle), lat: -66 - 10 * settle, bank: -0.08 * bank };
  if (id === "fire")
    return {
      ...target,
      lon: target.lon - 0.22 + 0.4 * settle,
      lat: target.lat - 0.18 + 0.35 * settle,
      bank: -0.04 * bank,
      pitch: 0.04 * bank,
    };
  if (id === "fault")
    return {
      ...target,
      lon: target.lon + 0.18 * bank,
      lat: target.lat - 0.12 * bank,
      zoom: target.zoom + 0.16 * bank,
      bank: 0.055 * bank,
      pitch: 0.08 * bank,
    };
  return { ...target, lon: target.lon - 2 * (1 - settle), bank: -0.04 * bank };
}
