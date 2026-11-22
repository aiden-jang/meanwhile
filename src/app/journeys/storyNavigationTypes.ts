import type { StoryPlace } from "../discovery/places";
import type { ObservatoryProps } from "../observatoryProps";
import type { useVisitMemory } from "../visitor/useVisitMemory";
import type { Visit } from "../visitor/library";
import type { SkyPosition } from "../tonight/skyMoment";
import type { CollectionPosition } from "../visitor/collectionReturn";
import type { useJourneyNavigation } from "./useJourneyNavigation";

export interface BrowseOrigin {
  route: ReturnType<ObservatoryProps["views"]["navigation"]["capture"]>;
  camera: ReturnType<ObservatoryProps["explorer"]["read"]>;
  scroll: number;
  scrollTarget: string;
  collection?: CollectionPosition;
  previous?: BrowseOrigin;
  flat: boolean;
  label: string;
  trigger: string;
}
export type StoryNavigationValue = {
  returnLabel: string | undefined;
  hasReturnOrigin: boolean;
  restoredCollection: CollectionPosition | null;
  dismissRestoration: () => void;
  openSkyAt: (city: string, trigger: string) => void;
  openNightfall: (position: SkyPosition, trigger: string) => void;
  openRadar: (at: number | undefined, map: boolean, trigger?: string) => void;
  returnToBrowse: () => boolean;
  browse: (focusSearch?: boolean) => void;
  explore: () => void;
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
  step: (index: number) => void;
  finish: (complete: boolean) => void;
};
