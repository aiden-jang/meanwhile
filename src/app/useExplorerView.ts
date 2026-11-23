import { useRef, useState, type MutableRefObject, type SetStateAction } from "react";
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
import type { explorerReadings } from "./explorerReadings";
import type { ExploreTarget } from "./visitor/observatorySearch";
import { restorePanel } from "./panelReturn";

type Nearby = { record: DepthRecord; camera: CameraState; originMap: boolean; map: boolean };
type Visit = { panel?: boolean | undefined; nearby?: Nearby; destination?: string | undefined };
type Camera = Pick<ReturnType<typeof useGlobeCamera>, "read" | "flyTo">;
type Readings = ReturnType<typeof explorerReadings>;
type ExploreSnapshot = {
  preferredMap: boolean;
  visit: Visit;
  camera: CameraState;
  scroll: number;
  readings: ReturnType<Readings["capture"]>;
};

export function useExplorerView(shared: Partial<Permalink>) {
  const [preferredMap, setPreferredMap] = useStoredFlag("flat", false, shared.section ? true : shared.flat);
  const [railOpen, saveRailOpen] = useStoredFlag("railOpen", true, shared.radarPlace ? true : undefined);
  const [visit, setVisit] = useState<Visit>({});
  const lastFree = useRef<ExploreSnapshot>();
  const chromeFloats = useFloatingChrome();
  const nearby = visit.nearby;
  return {
    nearby,
    destination: visit.destination,
    lastFree,
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
    open(panel: boolean | undefined, destination?: string) {
      setVisit({ panel, destination });
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
  readings: Readings,
  returnToLive: () => void,
) {
  function present(panel: boolean | undefined, prepare?: () => void) {
    reportAnalytics({ name: "explore_opened" });
    if (panel === false) observatory.navigation.requestExploreFocus("explorer-fold");
    observatory.exploreScene(() => {
      stopTour();
      if (prepare) prepare();
      else explorer.open(panel);
    });
  }
  const open = (panel?: boolean) => present(panel);
  function resume() {
    if (!observatory.observing && observatory.browser.pane === "layers" && !explorer.nearby) return;
    const previous = explorer.lastFree.current;
    const panel = previous ? previous.visit.panel : !observatory.landing;
    observatory.navigation.requestExploreFocus("explorer-layers-tab");
    observatory.browser.show("layers");
    present(panel, () => {
      if (previous) {
        explorer.restore(previous);
        readings.restore(previous.readings);
      } else explorer.open(panel);
    });
    if (previous) {
      const { lon, lat, zoom } = previous.camera;
      camera.flyTo.current(lon, lat, zoom);
      requestAnimationFrame(() =>
        restorePanel({
          scrollTarget: "chrome-rail",
          scroll: previous.scroll,
          focus: "explorer-layers-tab",
          fallback: "globe-view",
        }),
      );
    }
  }
  function find(target: ExploreTarget) {
    const place = target.kind === "place";
    const focus = place ? "place-title" : "layer-inspector-title";
    observatory.navigation.requestExploreFocus(focus);
    observatory.browser.show("layers");
    present(true, () => {
      readings.clear();
      readings.locate(place ? target : null);
      readings.inspect(place ? null : target.id);
      explorer.open(true, place ? target.name : target.id);
    });
    if (place) camera.flyTo.current(target.lon, target.lat, 2.2);
    requestAnimationFrame(() => restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus }));
  }
  function pickDate() {
    open(true);
    readings.inspect("earthquakes");
    observatory.browser.show("layers");
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("#archive-day, #archive-return")?.focus(),
    );
  }
  function nearby(record: DepthRecord) {
    const pose = { ...camera.read.current() };
    const map = observatory.observations.map;
    observatory.navigation.requestExploreFocus("cutaway-nearby-title");
    observatory.browser.show("layers");
    observatory.exploreScene(() => {
      stopTour();
      readings.clear();
      returnToLive();
      explorer.openNearby(record, pose, map);
    });
  }
  function back() {
    const saved = explorer.nearby;
    if (!saved) return;
    observatory.observeScene(() => {
      readings.clear();
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
  return { open, resume, find, nearby, back, pickDate };
}

export function useExplorerHistory(
  explorer: ReturnType<typeof useExplorerView>,
  observatory: ReturnType<typeof useObservatory>,
  archive: ReturnType<typeof useArchive>,
  stopTour: () => void,
  { read: readCamera, flyTo }: Camera,
  lastWritten: MutableRefObject<string>,
  readings: Readings,
) {
  useSceneHistory({
    route: {
      ...observatory.navigation,
      key: `${observatory.navigation.key}:${explorer.nearby?.record.id ?? explorer.destination ?? ""}`,
      capture: () => {
        const camera = { ...readCamera.current() };
        const reading = readings.capture();
        const state = explorer.capture();
        if (!observatory.observing && observatory.browser.pane === "layers" && !explorer.nearby)
          explorer.lastFree.current = {
            ...state,
            camera,
            scroll: document.getElementById("chrome-rail")?.scrollTop ?? 0,
            readings: reading,
          };
        return {
          view: observatory.navigation.capture(camera),
          day: archive.loadedDay,
          explorer: state,
          reading,
        };
      },
      restore(saved) {
        stopTour();
        explorer.restore(saved.explorer);
        observatory.navigation.restore(saved.view);
        readings.restore(saved.reading);
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
