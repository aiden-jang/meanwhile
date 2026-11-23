import type { RefObject, ReactNode } from "react";
import type { CameraState } from "../globe/controls";
import type { Stop } from "./tour";
import type { DiscoveriesData } from "./visitor/Discoveries";
import type { useAuroraOverflight } from "./useAuroraOverflight";
import type { EarthScene, useObservatory } from "./useObservatory";
export interface ObservatoryProps {
  explorer: {
    radarAt: number | undefined;
    radarFrameAt: number | undefined;
    flat: boolean;
    read: () => CameraState;
    restore: (camera: CameraState, flat?: boolean) => void;
    radarTime: (at: number | null) => void;
  };
  discoveries: DiscoveriesData;
  scene: EarthScene;
  at: number;
  ready: boolean;
  summary: string;
  feedNote: string | null;
  deepAvailable: boolean;
  aurora: ReturnType<typeof useAuroraOverflight>;
  views: Pick<
    ReturnType<typeof useObservatory>,
    | "observing"
    | "observeScene"
    | "landing"
    | "depthFocus"
    | "selectDepth"
    | "sun"
    | "tonight"
    | "floatDive"
    | "observations"
    | "skyCity"
    | "openAfterDarkArchive"
    | "closeStory"
    | "browser"
    | "visitCheckpoint"
    | "navigation"
    | "checkpoint"
    | "getMoment"
  >;
  radar: ReturnType<typeof useObservatory>["radar"];
  layerReadout: ReactNode;
  onScene: (scene: EarthScene, direct?: boolean) => void;
  onHome: () => void;
  onExplore: (showPanel?: boolean) => void;
  onPickDate: () => void;
  tour: {
    at: number | null;
    stop: Stop | null;
    length: number;
    paused: boolean;
    button: RefObject<HTMLButtonElement>;
    controls: RefObject<HTMLElement>;
    start: () => void;
    stopTour: () => void;
    next: () => void;
    previous: () => void;
    pause: () => void;
    available: boolean;
    inspect: (() => void) | null;
  };
  onHistory: (day: string) => void;
}
