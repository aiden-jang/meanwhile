import type { PerspectiveCamera } from "three";
import type { FloatDiveView } from "../app/float/floatPlayback";
import type { ObservationView } from "../app/observations/types";
import type { RadarView } from "../app/radar/radarCamera";
import type { MapLayerPresentation } from "../app/weatherLayers";
import type { AuroraRun } from "../sources/auroraRoute";
import type { TonightPresentation } from "./skyPresentation";

type LocalView = RadarView | TonightPresentation | FloatDiveView | ObservationView;
export type GlobePresentation =
  "planetarium" | "dayline" | "landing" | AuroraRun | LocalView | MapLayerPresentation | null;

export interface PassageOptics {
  magnification: number;
  releaseSurvey?: (complete: () => void) => boolean;
  section?: boolean;
  liveWeight?: number;
  frame?: (camera: PerspectiveCamera, canvas: HTMLCanvasElement) => void;
}

export function liveLayerView(mode: GlobePresentation) {
  return mode && typeof mode === "object" && "kind" in mode && mode.kind === "map-layers" ? mode : null;
}

export function isLocalView(mode: GlobePresentation): mode is LocalView {
  return mode !== null && typeof mode === "object" && "kind" in mode && mode.kind !== "map-layers";
}

export function isShadowChase(mode: GlobePresentation): boolean {
  return (
    isLocalView(mode) && mode.kind === "observation" && !!(mode.shadow || mode.sky?.sunCover !== undefined)
  );
}

export function isRecordedFlight(mode: GlobePresentation): boolean {
  return isLocalView(mode) && mode.kind === "observation" && !!mode.follow;
}
