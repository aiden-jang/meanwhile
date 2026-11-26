import type { StoryPlace } from "../discovery/places";
import type { ObservatoryProps } from "../observatoryProps";
import type { useVisitMemory } from "../visitor/useVisitMemory";
import type { Visit } from "../visitor/library";
import type { SkyPosition } from "../tonight/skyMoment";
import type { CollectionPosition } from "../visitor/collectionReturn";
import type { useJourneyNavigation } from "./useJourneyNavigation";
import type { ExploreTarget } from "../visitor/observatorySearch";
import type { FindPosition } from "../visitor/findPosition";

export interface BrowseOrigin {
  route: ReturnType<ObservatoryProps["views"]["navigation"]["capture"]>;
  camera: ReturnType<ObservatoryProps["explorer"]["read"]>;
  scroll: number;
  rowOffset?: number | undefined;
  scrollTarget: string;
  collection?: CollectionPosition;
  find?: FindPosition;
  previous?: BrowseOrigin;
  flat: boolean;
  label: string;
  trigger: string;
}
export type StoryNavigationValue = {
  returnLabel: string | undefined;
  returnView: Pick<BrowseOrigin, "camera" | "flat"> | null;
  hasReturnOrigin: boolean;
  auroraFromPass: boolean;
  katrinaFromWeather: boolean;
  restoredCollection: CollectionPosition | null;
  restoredFind: FindPosition | null;
  launchFromFind: (position: FindPosition, next: () => void) => void;
  dismissFind: () => void;
  dismissRestoration: () => void;
  openSkyAt: (city: string, trigger: string) => void;
  openNightfall: (position: SkyPosition, trigger: string) => void;
  openRadar: (at: number | undefined, map: boolean, trigger?: string) => void;
  returnToBrowse: () => boolean;
  browse: (focusSearch?: boolean) => void;
  explore: () => void;
  openEntrance: (id: ObservatoryProps["scene"]) => void;
  findTarget: (target: ExploreTarget) => void;
  findReturn?: { destination: string; back: () => void } | undefined;
  active: string | null;
  library: ReturnType<typeof useVisitMemory>["library"];
  current: () => Visit | null;
  resume: (visit: Visit, trigger?: string, smart?: boolean) => void;
  preview: (
    place?: Pick<StoryPlace, "lon" | "lat"> & { zoom?: number },
    restore?: boolean,
    keepProjection?: boolean,
  ) => void;
  previewMap: boolean;
  previewOpen: boolean;
  moonAboveHorizon?: boolean | undefined;
  previewCity: ObservatoryProps["views"]["skyCity"]["city"];
  browsingStories: boolean;
  completed: boolean;
  completion: (id: string, complete: boolean) => void;
  route: ReturnType<typeof useJourneyNavigation>["route"];
  progressFor: ReturnType<typeof useJourneyNavigation>["progressFor"];
  journeyProgress: ReturnType<typeof useJourneyNavigation>["journeyProgress"];
  continueJourney: (id: string, trigger: string) => void;
  unavailable: (id: string) => string | null;
  open: (id: string, trigger?: string, keepScene?: boolean) => void;
  start: (id: string, trigger?: string) => void;
  tour: () => void;
  step: (index: number, selected?: Visit) => void;
  stepUnavailable: (index: number) => string | null;
  finish: (complete: boolean) => void;
};
