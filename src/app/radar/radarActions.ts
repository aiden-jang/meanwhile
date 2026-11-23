import type { MutableRefObject } from "react";
import type { usePresentation } from "../usePresentation";
import type { useRadarPresentation } from "./useRadarPresentation";
import type { useObservationDeck } from "../observations/useObservationDeck";
import type { EarthScene, Presentation } from "../useObservatory";
import { currentRadarRegion, radarCamera, type RadarEntry, type RadarView } from "./radarCamera";

import { holdRadarScan } from "./heldRadarScan";

interface RadarState {
  radarView: RadarView | null;
  radarOrigin: MutableRefObject<Presentation>;
  radarEntry: MutableRefObject<RadarEntry>;
  setRadarView: ReturnType<typeof useRadarPresentation>["setView"];
  updateRadar: ReturnType<typeof useRadarPresentation>["update"];
}

interface RadarNavigation {
  presentation: Presentation;
  before: () => void;
  changePresentation: ReturnType<typeof usePresentation>["changePresentation"];
  setScene: (scene: EarthScene) => void;
  observations: ReturnType<typeof useObservationDeck>;
}

export function radarActions(
  { radarView, radarOrigin, radarEntry, setRadarView, updateRadar }: RadarState,
  { presentation, before, changePresentation, setScene, observations }: RadarNavigation,
) {
  return {
    active: radarView !== null,
    view: radarView,
    fromExplore: radarView !== null && radarOrigin.current === "explore",
    entry: radarEntry.current,
    open(region?: string, story = false, at?: number, pose?: RadarView["target"]) {
      if (region === currentRadarRegion && !pose) region = "world";
      before();
      radarOrigin.current = presentation;
      radarEntry.current = {
        ...(region ? { region } : {}),
        ...(at !== undefined ? { at } : {}),
        pose,
        story,
      };
      const open = () => {
        if (story) observations.close();
        setRadarView({
          kind: "radar",
          target: pose ?? radarCamera(region),
          region: region ?? "world",
          image: null,
          selectedAt: at,
        });
      };
      if (presentation === "observe") open();
      else
        changePresentation(
          "observe",
          true,
          () => {
            setScene("live");
            open();
          },
          false,
        );
    },
    depart(fade: boolean) {
      if (!radarView) return false;
      holdRadarScan(radarView);
      if (fade && radarView.image) {
        updateRadar({ ...radarView, departing: true });
        return true;
      }
      return false;
    },
    close() {
      before();
      observations.setMap(false);
      if (radarOrigin.current === "explore") changePresentation("explore", true, undefined, false);
      else {
        setRadarView(null);
        if (radarEntry.current.story) observations.open("atmospheric-river", "observatory-scenes");
      }
    },
    update: updateRadar,
  };
}
