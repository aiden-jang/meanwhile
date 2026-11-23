import { useState, type MutableRefObject, type SetStateAction } from "react";
import type { DepthRecord } from "../data/depthRecords";
import type { CameraState } from "../globe/controlsTypes";
import type { Permalink } from "./permalink";
import { useFloatingChrome } from "./useNarrow";
import { useStoredFlag } from "./useStored";
import type { useObservatory } from "./useObservatory";
import { recordedCutaway } from "./recordedCutaway";
import { reportAnalytics } from "../../analytics/browser";
import { useSceneHistory } from "./useSceneHistory";
import type { useArchive } from "./useArchive";
import type { useGlobeCamera } from "./useGlobeCamera";

type Nearby = { record: DepthRecord; camera: CameraState; originMap: boolean; map: boolean };
type Visit = { panel?: boolean | undefined; nearby?: Nearby | undefined };
type Camera = Pick<ReturnType<typeof useGlobeCamera>, "read" | "flyTo">;

export function useExplorerView(shared: Partial<Permalink>) {
  const [preferredMap, setPreferredMap] = useStoredFlag("flat", false, shared.section ? true : shared.flat);
  const [railOpen, saveRailOpen] = useStoredFlag("railOpen", true, shared.radarPlace ? true : undefined);
  const [visit, setVisit] = useState<Visit>({});
  const chromeFloats = useFloatingChrome();
  const nearby = visit.nearby;
  return {
    nearby,
    chromeFloats,
    railOpen: visit.panel ?? (railOpen || !chromeFloats),
    foldedByEntry: visit.panel === false,
    mapOn: nearby?.map ?? preferredMap,
    setFlat(map: SetStateAction<boolean>) {
      if (nearby) {
        setVisit((current) =>
          current.nearby
            ? {
                ...current,
                nearby: { ...current.nearby, map: typeof map === "function" ? map(current.nearby.map) : map },
              }
            : current,
        );
      } else setPreferredMap(map);
    },
    setRailOpen(open: boolean) {
      if (visit.panel !== undefined || nearby) setVisit((current) => ({ ...current, panel: open }));
      else saveRailOpen(open);
    },
    open(panel: boolean | undefined) {
      setVisit({ panel });
    },
    openNearby(record: DepthRecord, camera: CameraState, map: boolean) {
      setVisit({ panel: true, nearby: { record, camera, originMap: map, map } });
    },
    capture: () => ({ preferredMap, visit }),
    restore(saved: { preferredMap: boolean; visit: Visit }) {
      if (saved.preferredMap !== preferredMap) setPreferredMap(saved.preferredMap);
      setVisit(saved.visit);
    },
  };
}

export function explorerEntrances(
  explorer: ReturnType<typeof useExplorerView>,
  observatory: ReturnType<typeof useObservatory>,
  camera: Camera,
  stopTour: () => void,
  clearReading: () => void,
  returnToLive: () => void,
) {
  function open(panel?: boolean) {
    reportAnalytics({ name: "explore_opened" });
    if (panel === false) observatory.navigation.requestExploreFocus("explorer-fold");
    observatory.exploreScene(() => {
      stopTour();
      explorer.open(panel);
    });
  }
  function nearby(record: DepthRecord) {
    const pose = { ...camera.read.current() };
    const map = observatory.observations.map;
    observatory.navigation.requestExploreFocus("cutaway-nearby-title");
    observatory.browser.show("layers");
    observatory.exploreScene(() => {
      stopTour();
      clearReading();
      returnToLive();
      explorer.openNearby(record, pose, map);
    });
  }
  function back() {
    const saved = explorer.nearby;
    if (!saved) return;
    observatory.observeScene(() => {
      clearReading();
      explorer.open(undefined);
      observatory.chooseScene("depth", recordedCutaway(saved.record));
      observatory.observations.setMap(saved.originMap);
    });
    const { lon, lat, zoom } = saved.camera;
    camera.flyTo.current(lon, lat, zoom);
    requestAnimationFrame(() =>
      document.getElementById("explore-nearby-earthquakes")?.focus({ preventScroll: true }),
    );
  }
  return { open, nearby, back };
}

export function useExplorerHistory(
  explorer: ReturnType<typeof useExplorerView>,
  observatory: ReturnType<typeof useObservatory>,
  archive: ReturnType<typeof useArchive>,
  stopTour: () => void,
  { read: readCamera, flyTo }: Camera,
  lastWritten: MutableRefObject<string>,
) {
  useSceneHistory({
    route: {
      ...observatory.navigation,
      key: `${observatory.navigation.key}:${explorer.nearby?.record.id ?? ""}`,
      capture: () => ({
        view: observatory.navigation.capture(readCamera.current()),
        day: archive.loadedDay,
        explorer: explorer.capture(),
      }),
      restore(saved) {
        stopTour();
        explorer.restore(saved.explorer);
        observatory.navigation.restore(saved.view);
        if (saved.day !== archive.loadedDay || archive.archiveBusy) {
          if (saved.day) void archive.loadArchive(saved.day);
          else archive.backToLive();
        }
      },
    },
    checkpoint: observatory.checkpoint,
    readCamera,
    flyTo,
    lastWritten,
  });
}
