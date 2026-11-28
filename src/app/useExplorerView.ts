import { useRef, useState, type SetStateAction } from "react";
import type { LayerReport } from "./field/QuakeReading";
import type { DepthRecord } from "../data/depthRecords";
import type { CameraState } from "../globe/controlsTypes";
import type { Permalink } from "./permalink";
import { useFloatingChrome } from "./useNarrow";
import { useStoredFlag } from "./useStored";
import type { useObservatory } from "./useObservatory";
import { reportAnalytics } from "../../analytics/browser";
import type { useGlobeCamera } from "./useGlobeCamera";
import type { explorerReadings } from "./explorerReadings";
import type { ExploreTarget } from "./visitor/observatorySearch";
import { restorePanel } from "./panelReturn";
import type { SkyCity } from "../geo/tonight";
import { returnToScene, sceneEntry } from "./continuity/sceneEntry";
import type { MapLayer } from "./layerVisibility";
import type { WorldSubject, WorldVisit } from "./continuity/worldSubject";
import type { CityWeatherLayers, CityWeatherVisit } from "./tonight/cityWeather";

type SceneVisit = ReturnType<ReturnType<typeof useObservatory>["navigation"]["capture"]>;
type Nearby = { record: DepthRecord; map: boolean; from: SceneVisit; camera: CameraState };
type Visit = {
  layerReport?: LayerReport;
  layerListEntry?: MapLayer;
  panel?: boolean | undefined;
  nearby?: Nearby;
  world?: WorldVisit;
  city?: CityWeatherVisit;
  destination?: string | undefined;
  findEntry?: number;
  backToFind?: () => void;
};
type Camera = Pick<ReturnType<typeof useGlobeCamera>, "read" | "flyTo">;
type Readings = ReturnType<typeof explorerReadings>;
type ExploreSnapshot = {
  preferredMap: boolean;
  camera: CameraState;
};

export function useExplorerView(shared: Partial<Permalink>) {
  const [preferredMap, setPreferredMap] = useStoredFlag("flat", false, shared.section ? true : shared.flat);
  const [railOpen, saveRailOpen] = useStoredFlag(
    "railOpen",
    true,
    shared.radarPlace || shared.mark?.startsWith("cyclone:") ? true : undefined,
  );
  const [visit, setVisit] = useState<Visit>({});
  const findEntries = useRef(0);
  const lastFree = useRef<ExploreSnapshot>();
  const chromeFloats = useFloatingChrome();
  const nearby = visit.nearby;
  const city = visit.city;
  const world = visit.world;
  return {
    nearby,
    layerReport: visit.layerReport,
    openLayerReport(report: LayerReport) {
      setVisit((current) => ({ ...current, panel: true, layerReport: report }));
    },
    layerListEntry: visit.layerListEntry,
    openLayerFromList(id: MapLayer) {
      setVisit((current) => ({ ...current, panel: true, layerListEntry: id }));
    },
    city,
    world,
    destination: visit.destination,
    findEntry: visit.findEntry,
    backToFind: visit.backToFind,
    lastFree,
    chromeFloats,
    railOpen: visit.panel ?? railOpen,
    mapOn: world?.map ?? nearby?.map ?? city?.map ?? preferredMap,
    setFlat(map: SetStateAction<boolean>) {
      if (world || nearby || city) {
        setVisit((current) => {
          const key = current.world ? "world" : current.nearby ? "nearby" : "city";
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
    openFind(destination: string, backToFind: () => void) {
      setVisit({ panel: true, destination, findEntry: ++findEntries.current, backToFind });
    },
    openLayers(map?: boolean) {
      if (map !== undefined && map !== preferredMap) setPreferredMap(map);
      setVisit({});
      saveRailOpen(true);
    },
    openNearby(record: DepthRecord, camera: CameraState, from: SceneVisit, world?: WorldVisit) {
      setVisit({
        panel: true,
        nearby: { record, camera, from, map: from.deck.map },
        ...(world ? { world } : {}),
      });
    },
    openWorld(world: WorldVisit) {
      setVisit({ panel: true, world });
    },
    changeWorldLayer(layer: MapLayer, on: boolean) {
      setVisit((current) =>
        current.world
          ? { ...current, world: { ...current.world, layers: { ...current.world.layers, [layer]: on } } }
          : current,
      );
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
    const previous =
      observatory.observing || explorer.nearby || explorer.city || explorer.world
        ? explorer.lastFree.current
        : undefined;
    const focus = "explorer-layers-tab";
    observatory.navigation.requestExploreFocus(focus);
    observatory.browser.show("layers");
    present(true, () => {
      readings.clear();
      readings.inspect(null);
      readings.closeRadarRewind();
      explorer.openLayers(previous?.preferredMap);
    });
    if (previous) {
      const { lon, lat, zoom } = previous.camera;
      camera.flyTo.current(lon, lat, zoom);
    }
    requestAnimationFrame(() => restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus }));
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
    const pose = { ...camera.read.current() };
    const from = observatory.navigation.capture(pose);
    const before = explorer.capture();
    const reading = readings.capture();
    const backToFind = () => {
      observatory.checkpoint.current();
      explorer.restore(before);
      observatory.navigation.restore(from);
      readings.restore(reading);
      camera.flyTo.current(pose.lon, pose.lat, pose.zoom);
    };
    observatory.navigation.requestExploreFocus(focus);
    observatory.browser.show("layers");
    present(true, () => {
      readings.clear();
      readings.locate(place ? target : null);
      readings.inspect(place ? null : target.id);
      explorer.openFind(place ? target.name : target.id, backToFind);
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
  function showStories() {
    observatory.browser.show("stories");
    observatory.browser.select(null);
    observatory.browser.fold("full-catalogue", false);
    explorer.setRailOpen(true);
    requestAnimationFrame(() =>
      restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus: "explorer-stories-tab" }),
    );
  }
  function openLayer(layer: MapLayer) {
    observatory.browser.show("layers");
    readings.clearIsolation();
    explorer.changeWorldLayer(layer, true);
    readings.inspect(layer);
    explorer.setRailOpen(true);
    requestAnimationFrame(() =>
      restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus: "layer-inspector-title" }),
    );
  }
  function continueAt(
    subject: WorldSubject,
    opener?: HTMLElement,
    leave?: () => void,
    map = observatory.observing ? observatory.observations.map : explorer.mapOn,
  ) {
    opener?.focus({ preventScroll: true });
    observatory.checkpoint.current();
    const source = sceneEntry();
    const focus = "place-title";
    observatory.navigation.requestExploreFocus(focus);
    observatory.browser.show("layers");
    observatory.browser.fold("full-catalogue", false);
    present(true, () => {
      observatory.browser.select(null);
      leave?.();
      readings.clear();
      readings.closeRadarRewind();
      readings.clearIsolation();
      readings.inspect(null);
      readings.locate(subject.point);
      returnToLive();
      explorer.openWorld({ subject, source, map });
    });
    const pose = camera.read.current();
    const point = subject.point;
    camera.flyTo.current(point.lon, point.lat, subject.zoom ?? Math.max(1.45, Math.min(pose.zoom, 2.2)));
    requestAnimationFrame(() => restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus }));
  }
  function backToWorld() {
    if (!returnToScene(explorer.world?.source)) resume();
  }
  function nearby(record: DepthRecord, fromFiji = false) {
    const pose = { ...camera.read.current() };
    const from = observatory.navigation.capture(pose);
    const fromEntry = sceneEntry();
    const world = fromFiji
      ? {
          subject: {
            point: { lon: record.lon, lat: record.lat, name: "Fiji region" },
            from: "Fiji",
            layer: "earthquakes" as const,
            stories: ["rupture", "fault"],
            reading: {
              label: "Recorded earthquake",
              at: Date.parse(record.at),
              precision: "date" as const,
              value: `${record.scale} ${record.magnitude.toFixed(1)} · ${record.depthKm} km deep`,
            },
          },
          map: from.deck.map,
          source: fromEntry,
        }
      : undefined;
    observatory.navigation.requestExploreFocus("cutaway-nearby-title");
    observatory.browser.show("layers");
    observatory.exploreScene(() => {
      stopTour();
      if (world) {
        observatory.browser.select(null);
        observatory.browser.fold("full-catalogue", false);
      }
      readings.clear();
      readings.inspect("earthquakes");
      returnToLive();
      explorer.openNearby(record, pose, from, world);
    });
    if (world) camera.flyTo.current(record.lon, record.lat, Math.max(1.55, Math.min(pose.zoom, 2.1)));
  }
  function back() {
    const saved = explorer.nearby;
    if (!saved || returnToScene(explorer.world?.source)) return;
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
    if (explorer.world) {
      explorer.openWorld(explorer.world);
      readings.locate(explorer.world.subject.point);
    } else explorer.open(true);
    requestAnimationFrame(() =>
      restorePanel({ scrollTarget: "chrome-rail", scroll: 0, focus: "inspect-earthquakes" }),
    );
  }
  return {
    open,
    resume,
    hasPreviousView: () => explorer.lastFree.current !== undefined,
    find,
    storm,
    nearby,
    back,
    allLayers,
    pickDate,
    cityWeather,
    backToSky,
    continueAt,
    world: explorer.world,
    hasReadingContext: (point: { lon: number; lat: number } | null) =>
      !!explorer.world && (!!explorer.nearby || point === explorer.world.subject.point),
    backToWorld,
    showStories,
    openLayer,
    findReturn:
      explorer.destination && explorer.backToFind
        ? { destination: explorer.destination, back: explorer.backToFind }
        : undefined,
  };
}
