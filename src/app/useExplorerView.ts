import { useRef, useState, type MutableRefObject, type SetStateAction } from "react";
import type { DepthRecord } from "../data/depthRecords";
import type { CameraState } from "../globe/controlsTypes";
import type { Permalink } from "./permalink";
import { useFloatingChrome } from "./useNarrow";
import { useStoredFlag } from "./useStored";
import type { useObservatory } from "./useObservatory";
import { reportAnalytics } from "../../analytics/browser";
import { useSceneHistory } from "./useSceneHistory";
import type { useArchive } from "./useArchive";
import type { useGlobeCamera } from "./useGlobeCamera";
import type { explorerReadings } from "./explorerReadings";
import type { ExploreTarget } from "./visitor/observatorySearch";
import { restorePanel } from "./panelReturn";
import type { SkyCity } from "../geo/tonight";
import type { CityWeatherLayers, CityWeatherVisit } from "./tonight/cityWeather";

type SceneVisit = ReturnType<ReturnType<typeof useObservatory>["navigation"]["capture"]>;
type Nearby = { record: DepthRecord; camera: CameraState; from: SceneVisit; map: boolean };
type Visit = {
  panel?: boolean | undefined;
  nearby?: Nearby;
  city?: CityWeatherVisit;
  destination?: string | undefined;
};
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
  const [railOpen, saveRailOpen] = useStoredFlag(
    "railOpen",
    true,
    shared.radarPlace || shared.mark?.startsWith("cyclone:") ? true : undefined,
  );
  const [visit, setVisit] = useState<Visit>({});
  const lastFree = useRef<ExploreSnapshot>();
  const chromeFloats = useFloatingChrome();
  const nearby = visit.nearby;
  const city = visit.city;
  return {
    nearby,
    city,
    destination: visit.destination,
    lastFree,
    chromeFloats,
    railOpen: visit.panel ?? railOpen,
    mapOn: nearby?.map ?? city?.map ?? preferredMap,
    setFlat(map: SetStateAction<boolean>) {
      if (nearby || city) {
        setVisit((current) => {
          const key = current.nearby ? "nearby" : "city";
          const scope = current[key];
          return scope
            ? { ...current, [key]: { ...scope, map: typeof map === "function" ? map(scope.map) : map } }
            : current;
        });
      } else setPreferredMap(map);
    },
    setRailOpen(open: boolean) {
      if (visit.panel !== undefined) setVisit((current) => ({ ...current, panel: open }));
      else saveRailOpen(open);
    },
    open(panel: boolean | undefined, destination?: string) {
      setVisit({ panel, destination });
    },
    openNearby(record: DepthRecord, camera: CameraState, from: SceneVisit) {
      setVisit({ panel: true, nearby: { record, camera, from, map: from.deck.map } });
    },
    openCity(city: CityWeatherVisit) {
      setVisit({ panel: true, city });
    },
    changeCityLayer(layer: keyof CityWeatherLayers, on: boolean) {
      setVisit((current) =>
        current.city
          ? { ...current, city: { ...current.city, layers: { ...current.city.layers, [layer]: on } } }
          : current,
      );
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
    if (
      !observatory.observing &&
      observatory.browser.pane === "layers" &&
      !explorer.nearby &&
      !explorer.city
    ) {
      explorer.setRailOpen(true);
      return;
    }
    const previous = explorer.lastFree.current;
    observatory.navigation.requestExploreFocus("explorer-layers-tab");
    observatory.browser.show("layers");
    present(true, () => {
      if (previous) {
        explorer.restore({ ...previous, visit: { ...previous.visit, panel: true } });
        readings.restore(previous.readings);
      } else explorer.open(true);
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
  function radar() {
    const target = { ...camera.read.current() };
    observatory.navigation.requestExploreFocus("layer-inspector-title");
    observatory.browser.show("layers");
    present(true, () => {
      returnToLive();
      readings.clear();
      readings.openRadar(target);
      explorer.open(true, "radar");
    });
    requestAnimationFrame(() =>
      restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus: "layer-inspector-title" }),
    );
  }
  function storm(id: string) {
    const prepare = () => {
      readings.clear();
      readings.selectHazard(id);
      explorer.open(true, "storm");
    };
    if (explorer.destination !== "storm") observatory.checkpoint.current();
    if (observatory.observing) {
      observatory.navigation.requestExploreFocus("live-storm-title");
      observatory.browser.show("layers");
      present(true, prepare);
    } else prepare();
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
  function cityWeather(city: SkyCity, at: number) {
    const pose = { ...camera.read.current() };
    const from = observatory.navigation.capture(pose);
    observatory.navigation.requestExploreFocus("city-weather-title");
    observatory.browser.show("layers");
    present(true, () => {
      readings.clear();
      readings.inspect(null);
      returnToLive();
      explorer.openCity({ city, at, from, map: from.deck.map, layers: { radar: true, wind: true } });
    });
    camera.flyTo.current(pose.lon, pose.lat, pose.zoom);
  }
  function backToSky() {
    const city = explorer.city;
    if (!city) return;
    const { from } = city;
    observatory.navigation.restore({
      ...from,
      sky: { ...from.sky, orbit: false },
      deck: { ...from.deck, map: false },
    });
    explorer.open(undefined);
    requestAnimationFrame(() =>
      document.getElementById("see-observing-city")?.focus({ preventScroll: true }),
    );
  }
  function nearby(record: DepthRecord) {
    const pose = { ...camera.read.current() };
    const from = observatory.navigation.capture(pose);
    observatory.navigation.requestExploreFocus("cutaway-nearby-title");
    observatory.browser.show("layers");
    observatory.exploreScene(() => {
      stopTour();
      readings.clear();
      readings.inspect("earthquakes");
      returnToLive();
      explorer.openNearby(record, pose, from);
    });
  }
  function back() {
    const saved = explorer.nearby;
    if (!saved) return;
    observatory.navigation.restore(saved.from);
    readings.clear();
    explorer.open(undefined);
    const { lon, lat, zoom } = saved.camera;
    camera.flyTo.current(lon, lat, zoom);
    requestAnimationFrame(() =>
      document.getElementById("explore-nearby-earthquakes")?.focus({ preventScroll: true }),
    );
  }
  function allLayers() {
    observatory.checkpoint.current();
    readings.clear();
    readings.inspect(null);
    explorer.open(true);
    requestAnimationFrame(() =>
      restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus: "inspect-earthquakes" }),
    );
  }
  return { open, resume, find, radar, storm, nearby, back, allLayers, pickDate, cityWeather, backToSky };
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
      key: `${observatory.navigation.key}:${explorer.nearby?.record.id ?? explorer.city?.city.name ?? explorer.destination ?? ""}`,
      capture: () => {
        const camera = { ...readCamera.current() };
        const reading = readings.capture();
        const state = explorer.capture();
        if (
          !observatory.observing &&
          observatory.browser.pane === "layers" &&
          !explorer.nearby &&
          !explorer.city &&
          explorer.destination !== "storm"
        )
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
