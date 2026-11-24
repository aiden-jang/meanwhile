import { EarthquakeDiscovery } from "./app/EarthquakeDiscovery";
import { searchStories } from "./app/storyIndex";
import { useWorldLayout } from "./app/useWorldLayout";
import { closeDetail } from "./app/closeDetail";
import { useWorldSelection } from "./app/useWorldSelection";
import { CityWeatherReading } from "./app/tonight/CityWeatherReading";
import { ExplorerFold, ExplorerSidebar } from "./app/ExplorerSidebar";
import { StoryNavigation } from "./app/journeys/StoryNavigation";
import { EarthquakeComparisons } from "./app/EarthquakeComparisons";
import { LayerWindow } from "./app/LayerWindow";
import { EarthquakeContext, NearbyEarthquake } from "./app/EarthquakeContext";
import { EarthquakeOptions } from "./app/EarthquakeOptions";
import { EarthquakeInspector } from "./app/EarthquakeInspector";
import { usePlaceInspection } from "./app/discovery/usePlaceInspection";
import { explorerEntrances, useExplorerHistory, useExplorerView } from "./app/useExplorerView";
import { explorerReadings } from "./app/explorerReadings";
import { MapLayers } from "./app/MapLayers";
import { observatoryBackdrop } from "./app/storyBackdrop";
import { useMapLayers } from "./app/useMapLayers";
import { hazardsInWindow, hasLegendMarks, markBelongsToLayer, visibleHazards } from "./app/layerVisibility";
import { SourceFilter } from "./app/SourceFilter";
import { observatoryCaption } from "./app/observatoryCaption";
import { useSharedLocation } from "./app/useSharedLocation";
import { explorerCamera, useGlobeCamera } from "./app/useGlobeCamera";
import { WaveReplayControls } from "./app/WaveReplayControls";
import { useEventInspection } from "./app/useEventInspection";
import { SequenceReplayControls } from "./app/SequenceReplayControls";
import { CanvasStamp, KeyboardHelp } from "./app/CanvasFooter";
import { LayerReadout } from "./app/LayerReadout";
import { Observatory, type ObservatoryProps } from "./app/Observatory";
import { journeyFor, observatorySummary, observatoryFeedNote } from "./app/journeys";
import { GlobeHeader, SkipControls } from "./app/GlobeHeader";
import { earthSceneTarget, useObservatory, type EarthScene } from "./app/useObservatory";
import { useAuroraOverflight } from "./app/useAuroraOverflight";
import { useCutaway } from "./app/useCutaway";
import { useReplayAnalytics } from "./app/useReplayAnalytics";
import { reportAnalytics } from "../analytics/browser";
import { useGlobeResources } from "./app/useGlobeResources";
import { useGlobeTour } from "./app/useGlobeTour";
import { GlobeLoading } from "./globe/GlobeLoading";
import { useFeedSnapshot } from "./app/useFeedSnapshot";
import { useStill } from "./app/useStill";
import { RegionalResults } from "./app/RegionalResults";
import { APRIL_ECLIPSE_DAY } from "./geo/aprilEclipse";
import { eclipseClock } from "./app/eclipseReplay";
import { EclipseReplayControls } from "./app/EclipseReplayControls";
import { useEclipsePlayback } from "./app/useEclipsePlayback";
import { useTimelinePlayback } from "./app/useTimelinePlayback";
import { ArchiveControls } from "./app/ArchiveControls";
import { useArchive } from "./app/useArchive";
import { cloneElement, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
const Globe = lazy(() => import("./globe/Globe").then((m) => ({ default: m.Globe })));
import { createFeed, DEFAULT_FILTERS } from "./app/feed";
import { countByRegion } from "./app/regions";
import { search, type Hit } from "./app/search";
import { useRolling } from "./app/roll";
import { useStoredFlag, useStoredName, useStoredNumber } from "./app/useStored";
import { newestEpisode } from "./sources/volcanoes";
import { summarise, FEED_CAP } from "./sources/wildfires";
import { countries } from "./sources/floods";
import { marksFor } from "./app/marks";
import { depthBands } from "./data/depth";
import { findSubject, MarkCard } from "./app/MarkCard";
import { hazardGroups, outsideWindowNote } from "./app/hazards";
import { sizesOf } from "./app/gutenberg";
import { SizeChart } from "./app/Sizes";
import { createSiren, type Siren } from "./app/sound";
import { lunarEclipse, solarEclipse } from "./geo/eclipse";
import { closestTo, localZone, viewerPlace } from "./app/viewer";
import { comparableCount, rankDay, type Span as BaselineSpan } from "./data/baseline";
import { boundarySegments, nearestBoundaryKm } from "./geo/boundaryDistance";
import { boundarySummary } from "./app/boundarySummary";
import { useExploreKeys } from "./app/useExploreKeys";
import { ExploreSheet } from "./app/ExploreSheet";
import { ExploreNotices } from "./app/ViewNotices";
import { useLiveStorm } from "./app/storm/useLiveStorm";
import { earthquakeCoverage, earthquakeEmpty, earthquakeReach } from "./app/earthquakeStatus";
import { feedStatus } from "./app/feedStatus";
import { useHazardLayers } from "./app/useHazardLayers";
import { DetailPanel } from "./app/DetailPanel";
import { MagnitudeFilter } from "./app/MagnitudeFilter";
import { Timeline } from "./app/Timeline";
import { clamp as clampScrub, dragTo, fractionOf, LIVE, nudge, togglePlay, type Scrub } from "./app/scrub";
import { Resizer } from "./app/Resizer";
import { CrossSection } from "./app/CrossSection";
import { buildSection, type SectionHinge, type SectionLine } from "./app/section";
import { BUCKETS, histogram, totalIn } from "./app/histogram";
import { diurnal } from "./app/diurnal";
import { decode } from "./app/permalink";
import { replaceViewLocation } from "./app/viewLocation";
import { versusReference } from "./app/versus";
import { superlativeFor } from "./app/superlative";
import { type RampName } from "./globe/ramp";
import { matches, windowStart } from "./data/filter";
import type { Filters, Quake, SourceId } from "./data/types";
import { clock, corroborationNote, compactSpan } from "./app/format";

/* Built here and not in an effect. In an effect, StrictMode mounts twice and you get two WebSockets. */
const feed = createFeed();

// Share bounds between resizing and restoring saved rail widths.
const RAIL_MIN = 264;
const RAIL_MAX = 620;
const RAIL_DEFAULT = Math.min(480, Math.max(320, Math.round(window.innerWidth * 0.295)));
export function App(): JSX.Element {
  // Capture the shared starting position before the first visual frame.
  const shared = useMemo(() => decode(window.location.hash), []);

  const snapshot = useFeedSnapshot(feed);
  const historyIntent = useRef<string | null>(null);
  const observatory = useObservatory(shared);
  const { enterExplore, enterObserve, chooseScene, setReady: setGlobeReady } = observatory;
  const globeCamera = useGlobeCamera(shared, setGlobeReady);
  const { flyTo, camera, home, read: readCamera, onReady } = globeCamera;
  const [liveFilters, setFilters] = useState<Filters>(() => ({
    minMagnitude: shared.minMagnitude ?? DEFAULT_FILTERS.minMagnitude,
    windowMs: shared.windowHours === undefined ? DEFAULT_FILTERS.windowMs : shared.windowHours * 3_600_000,
    sources: new Set(shared.sources ?? [...DEFAULT_FILTERS.sources]),
  }));
  const { archive } = snapshot;
  const filters = useMemo(
    () => (archive ? { ...liveFilters, windowMs: archive.to - archive.from } : liveFilters),
    [archive, liveFilters],
  );
  const partialArchive =
    archive?.answered && Object.values(archive.answered).some((answer) => !answer || answer.truncated);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [replay, setReplay] = useState<{ at: number; revealed: number } | null>(null);
  const receiveReplay = useReplayAnalytics(setReplay);
  const [scrub, setScrub] = useState<Scrub>(
    shared.cursor === undefined ? LIVE : { at: shared.cursor, playing: false },
  );
  const [pendingRev, setPendingRev] = useState<number | null>(null);
  const [missingShared, setMissingShared] = useState<string | null>(shared.event ?? null);
  const [focusHour, setFocusHour] = useState<number | null>(null);
  const { aurora, cyclones, fires, floods, volcanoes, answered, checked } = useHazardLayers();
  const clockAt = useCallback(() => feed.snapshot().archive?.to ?? Date.now(), []);
  const archived = snapshot.archive !== null;
  const initialArchiveMark = useRef(shared.day ? (shared.mark ?? null) : null);
  const archiveState = useArchive(feed, snapshot.archive, shared.day, (returnedToLive) => {
    const archive = feed.snapshot().archive;
    setSelected(null);
    setMarkId(
      !returnedToLive && archive?.from === Date.parse(shared.day ?? "") ? initialArchiveMark.current : null,
    );
    initialArchiveMark.current = null;
    if (returnedToLive) setScrub(LIVE);
    const day = historyIntent.current;
    historyIntent.current = null;
    if (day && !returnedToLive && archive && new Date(archive.from).toISOString().slice(0, 10) === day) {
      let largest: Quake | null = null;
      feed.store.forEach((q) => {
        if (!largest || q.primary.magnitude > largest.primary.magnitude) largest = q;
      });
      const key = (largest as Quake | null)?.key;
      if (key) selectQuake(key);
    }
  });
  const { archiveHazards, backToLive, stepDay, archiveBusy, archiveDay, loadedDay } = archiveState;
  const earthquakeFeedsDown =
    !archived &&
    !archiveBusy &&
    snapshot.statuses.usgs.kind === "failing" &&
    snapshot.statuses.emsc.kind === "failing";
  const explorerView = useExplorerView(shared);
  const { mapOn, setFlat, railOpen, setRailOpen, chromeFloats } = explorerView;
  const flat = observatory.observing ? observatory.observations.map : mapOn;
  const chase = useEclipsePlayback(
    loadedDay === APRIL_ECLIPSE_DAY && !archiveBusy && !flat && !observatory.observing,
    setScrub,
  );
  const inspection = useEventInspection(
    selected,
    !observatory.observing && !flat && !archiveBusy && !chase.frame,
  );
  const now = snapshot.archive ? snapshot.archive.to : Date.now();
  const minuteClock = Math.floor(now / 60_000) * 60_000;
  const overflight = useAuroraOverflight(aurora, answered.aurora, observatory.aurora, !archived, minuteClock);
  const span = snapshot.archive ?? { from: now - filters.windowMs, to: now };
  const view = chase.frame ? { at: chase.frame.at, playing: chase.playing } : clampScrub(scrub, span);
  const viewClock = view.at === null ? null : chase.frame ? eclipseClock(view.at) : clock(view.at);
  // Hourly hazard feeds advance in timeline buckets rather than on every playback frame.
  const revealStep = filters.windowMs / BUCKETS;
  const revealAt = view.at === null ? null : Math.floor(view.at / revealStep) * revealStep;
  const inWindow = useMemo(() => {
    return {
      ...hazardsInWindow(
        {
          cyclones: archived ? (archiveHazards?.cyclones ?? []) : cyclones,
          volcanoes: archived ? (archiveHazards?.volcanoes ?? []) : volcanoes,
          fires: archived ? (archiveHazards?.fires ?? []) : fires,
          floods: archived ? (archiveHazards?.floods ?? []) : floods,
        },
        minuteClock,
        filters.windowMs,
        revealAt,
      ),
      aurora: archived ? null : aurora,
    };
  }, [
    archived,
    archiveHazards,
    cyclones,
    volcanoes,
    fires,
    floods,
    aurora,
    filters.windowMs,
    revealAt,
    minuteClock,
  ]);
  const [markId, setMarkId] = useState<string | null>(shared.day ? null : (shared.mark ?? null));
  const followEnabled = !archived && !archiveBusy && !explorerView.nearby && !explorerView.city;
  const storm = useLiveStorm(
    followEnabled ? cyclones.find(({ id }) => markId === `cyclone:${id}`) : undefined,
    !observatory.observing && observatory.browser.pane === "layers",
  );
  const mapLayers = useMapLayers(
    filters,
    observatory.backgroundLayers,
    shared.event || shared.day ? "quake:" : (shared.mark ?? undefined),
    archived || archiveBusy,
    shared,
    observatory.browsingStories && !observatory.localReadings ? "catalogue" : observatory.localReadings,
    explorerView.nearby ? "nearby" : explorerView.city?.layers,
    storm?.overlay,
  );
  const onGlobe = useMemo(() => visibleHazards(inWindow, mapLayers.rendered), [inWindow, mapLayers.rendered]);
  const hazardTally = useMemo(() => {
    const held = archived
      ? {
          cyclones: archiveHazards?.cyclones ?? [],
          volcanoes: archiveHazards?.volcanoes ?? [],
          fires: archiveHazards?.fires ?? [],
          floods: archiveHazards?.floods ?? [],
        }
      : { cyclones, volcanoes, fires, floods };
    const newestOf = <T,>(list: readonly T[], dateOf: (h: T) => number | null): number | null =>
      list.reduce<number | null>((best, h) => {
        const at = dateOf(h);
        return at === null ? best : best === null ? at : Math.max(best, at);
      }, null);
    const started = (h: { startedAt: number | null }): number | null => h.startedAt;
    return [
      {
        kind: "cyclone" as const,
        held: held.cyclones.length,
        shown: inWindow.cyclones.length,
        newest: newestOf(held.cyclones, started),
      },
      {
        kind: "fire" as const,
        held: held.fires.length,
        shown: inWindow.fires.length,
        newest: newestOf(held.fires, started),
      },
      {
        kind: "flood" as const,
        held: held.floods.length,
        shown: inWindow.floods.length,
        newest: newestOf(held.floods, started),
      },
      {
        kind: "volcano" as const,
        held: held.volcanoes.length,
        shown: inWindow.volcanoes.length,
        newest: newestOf(held.volcanoes, (v) => v.endedAt),
      },
    ];
  }, [
    archived,
    archiveHazards,
    cyclones,
    volcanoes,
    fires,
    floods,
    inWindow.cyclones,
    inWindow.fires,
    inWindow.floods,
    inWindow.volcanoes,
  ]);
  const fireSummary = useMemo(() => summarise(onGlobe.fires), [onGlobe.fires]);
  // Keyed on the revision, not the clock: the rail re-renders every second and these only move when an
  // earthquake arrives. Same reason everywhere else in this file that keys on `snapshot.revision`.
  const depth = useMemo(
    () => depthBands(feed.store, filters, clockAt()),
    // Data revisions invalidate depth bands while the store identity stays fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, snapshot.revision, clockAt],
  );
  /* Clamp on the way in too. The `Resizer` bounds this while dragging and the restore path went around
     it, so a stored 1 came back as a rail one pixel wide with nothing to grab. */
  const [railWidth, setRailWidth] = useStoredNumber("rail", RAIL_DEFAULT, (n) =>
    Math.min(RAIL_MAX, Math.max(RAIL_MIN, n)),
  );
  /* 0 leaves the sheet at its default position until the visitor chooses a height. */
  const [sheetCanvas, setSheetCanvas] = useStoredNumber("sheet", 0, (n) => Math.max(0, n));
  const [regionsHeight, setRegionsHeight] = useStoredNumber("regions", 132);
  const [sectionLine, setSectionLine] = useState<(SectionLine & { hinge?: SectionHinge }) | null>(
    shared.section ?? null,
  );
  // Read lazily, so the first paint has the right ramp instead of flashing the default one.
  const [ramp, setRamp] = useStoredName<RampName>("ramp", "thermal", ["thermal", "cividis"], shared.ramp);
  const [announceAbove, setAnnounceAbove] = useStoredNumber("announceAbove", 4.5);
  const resetView = useCallback(() => {
    setQuery("");
    setSectionLine(null);
    setScrub(LIVE);
    setSelected(null);
    setMarkId(null);
    setFarSideOf(null);
    setFilters({ ...DEFAULT_FILTERS, sources: new Set(DEFAULT_FILTERS.sources) });
    if (feed.snapshot().archive !== null) backToLive();
    if (feed.setWindow(DEFAULT_FILTERS.windowMs)) setPendingRev(feed.snapshot().revision);
    flyTo.current(home.current.lon, home.current.lat, home.current.zoom, 0, true);
    replaceViewLocation(window.location.pathname + window.location.search);
    // The writer only writes while the hash is the one it last wrote, which is what protects a pasted
    // link. Emptying it without saying so leaves the writer refusing to write again.
    lastWritten.current = window.location.hash;
  }, [backToLive, flyTo, home]);
  const [farSideOf, setFarSideOf] = useState<string | null>(null);
  const [keyOpen, setKeyOpen] = useStoredFlag("legendKey", false);
  const [motionOn, setMotionOn] = useStoredFlag("motion", false);
  const [sinkOn, setSinkOn] = useStoredFlag("depthSink", true);
  // Load the slab only when requested; the depth markers alone need no extra geometry.
  const [slabOn, setSlabOn] = useStoredFlag("slab", false);
  const [figuresOn, setFiguresOn] = useStoredFlag("figures", false);
  const { zones, motionData, motion, slabData, figureData } = useGlobeResources({
    motionOn,
    slabOn: slabOn || observatory.depth,
    figuresOn: figuresOn || observatory.night,
  });
  const here = useMemo(() => (zones ? viewerPlace(zones, localZone()) : null), [zones]);
  const segments = useMemo(() => boundarySegments(), []);
  // Cached per event, not per render: a month of events against every segment is a million tests, and
  // an epicentre never moves.
  const boundaryCache = useRef(new Map<string, number>());
  const boundaryKmOf = useCallback(
    (quake: Quake): number | null => {
      if (segments.length === 0) return null;
      const cached = boundaryCache.current.get(quake.key);
      if (cached !== undefined) return cached;
      const km = nearestBoundaryKm(quake.primary.lon, quake.primary.lat, segments);
      if (km === null) return null;
      boundaryCache.current.set(quake.key, km);
      return km;
    },
    [segments],
  );
  /* Build the AudioContext on the press. Built without a user gesture it starts suspended and drops
  every later tone in silence: the toggle says on and nothing is heard. */
  const [sound, setSound] = useState(false);
  const siren = useRef<Siren | null>(null);
  useEffect(() => {
    if (!sound) {
      siren.current?.close();
      siren.current = null;
      return undefined;
    }
    try {
      siren.current = createSiren();
    } catch {
      siren.current = null;
    }
    return () => {
      siren.current?.close();
      siren.current = null;
    };
  }, [sound]);
  const onNews = useCallback((magnitudes: number[]) => {
    siren.current?.play(magnitudes);
  }, []);
  const lastWritten = useRef<string>(window.location.hash);
  const { cutaway, onCutaway, onSink } = useCutaway(
    () => (selected ? feed.store.get(selected)?.primary : null) ?? camera.current,
    setSinkOn,
  );
  const place = usePlaceInspection(setRailOpen, shared.radarPlace);
  const readings = explorerReadings(
    mapLayers,
    place,
    [selected, setSelected],
    [markId, setMarkId],
    [sectionLine, setSectionLine],
  );
  useExplorerHistory(
    explorerView,
    observatory,
    archiveState,
    () => stopTour(),
    globeCamera,
    lastWritten,
    readings,
  );
  useSharedLocation({
    feed,
    filters,
    selected,
    ramp,
    sectionLine,
    archive: snapshot.archive,
    markId,
    at: view.at,
    playing: view.playing,
    mapOn,
    presentation: observatory.presentation,
    scene: observatory.scene,
    catalogue: (observatory.observing ? observatory.browser.open : observatory.browser.pane === "stories")
      ? (observatory.browser.category ?? "all")
      : undefined,
    observatory,
    layers: mapLayers.enabled,
    layerTimes: mapLayers.selectedTimes,
    radarPlace: mapLayers.rewindPoint,
    camera,
    lastWritten,
  });
  const fetching = pendingRev !== null && snapshot.revision === pendingRev;
  const litAt = observatory.viewAt ?? view.at ?? (archived ? clockAt() : null);
  const eclipseKey = litAt ?? Math.floor(Date.now() / 60_000) * 60_000;
  const eclipse = useMemo(() => {
    const solar = solarEclipse(eclipseKey);
    if (solar.touching) return { kind: solar.umbra > 0 ? "total" : "annular" } as const;
    return lunarEclipse(eclipseKey).umbral > 0 ? ({ kind: "lunar" } as const) : null;
  }, [eclipseKey]);
  const { saving, stillCounts, saveStill, onCapture, notice, download, dismiss, clip } = useStill(
    feed,
    mapLayers.globeFilters,
    ramp,
    overflight.run?.forecast.forecastAt ?? view.at,
    mapLayers.captureNote(
      overflight.run
        ? "NOAA OVATION · illustrative veil"
        : (cutaway || observatory.depthFocus) && !flat
          ? "reference cutaway · true scale"
          : null,
    ),
    () => observatoryCaption(observatory, litAt ?? Date.now()),
    { ready: observatory.canCapture && mapLayers.canCapture, key: observatory.navigation.key },
  );
  const revealedNow = ((): number | null => {
    if (view.at === null) return null;
    const limit = view.at;
    let n = 0;
    feed.store.forEach((quake) => {
      if (quake.primary.time > limit) return;
      if (matches(quake, filters, now)) n += 1;
    });
    return n;
  })();
  const regions = useMemo(
    () => countByRegion(feed.store, filters, clockAt()).filter((r) => r.count > 0),
    // Arrivals change regional counts without replacing the external store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, snapshot.revision, clockAt],
  );

  const journey = useMemo(
    () => journeyFor(feed.store, filters, clockAt(), regions, view.at),
    // Data revisions own the external store's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, snapshot.revision, regions, clockAt, view.at],
  );
  const {
    tourAt,
    touring,
    tourButton,
    startTour: beginTour,
    stopTour,
    tourControls,
    paused: tourPaused,
    nextTour,
    previousTour,
    togglePause,
    tourLength,
    onCamera: observeTourCamera,
  } = useGlobeTour(journey.stops, flyTo, observatory.setTourStop);
  const startTour = useCallback(() => {
    chooseScene("live");
    setSelected(null);
    setMarkId(null);
    setSectionLine(null);
    setQuery("");
    enterObserve();
    beginTour();
  }, [beginTour, chooseScene, enterObserve]);
  const entrances = explorerEntrances(explorerView, observatory, globeCamera, stopTour, readings, () => {
    if (archived || archiveBusy) backToLive();
    setScrub(LIVE);
  });
  const closeReading = (kind: "quake" | "hazard" | "section") =>
    closeDetail(kind, () => {
      if (kind === "quake") setSelected(null);
      else if (kind === "hazard") setMarkId(null);
      else setSectionLine(null);
    });
  const chooseEarthScene = (scene: EarthScene, direct = false): void => {
    stopTour();
    const deepest = direct ? "archive" : journey.deepest;
    const next = earthSceneTarget(scene, deepest, view.at ?? clockAt(), home.current);
    chooseScene(next.scene, next.focus);
    if (next.scene === "live" && (archived || archiveBusy)) backToLive();
    if (!direct || scene !== "live") flyTo.current(...next.camera);
    else setScrub(LIVE);
  };
  function returnHome() {
    observatory.home(() => {
      stopTour();
      explorerView.open(undefined);
    });
    if (archived || archiveBusy) backToLive();
    flyTo.current(home.current.lon, home.current.lat, home.current.zoom);
  }
  const section = useMemo(
    () =>
      sectionLine && !mapLayers.suspended
        ? buildSection(
            feed.store,
            sectionLine,
            filters,
            clockAt(),
            undefined,
            slabOn && slabData.length > 0 ? slabData : [],
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed.store, sectionLine, filters, snapshot.revision, slabOn, slabData, mapLayers.suspended],
  );
  useEffect(() => {
    if (!missingShared) return;
    const [source, id] = missingShared.split(":") as [SourceId, string];
    const found = feed.store.findByReading(source, id);
    if (found) {
      setSelected(found.key);
      setMissingShared(null);
    }
  }, [missingShared, snapshot.revision]);

  const pinned = selected ? feed.store.get(selected) : undefined;
  const lastPinned = useRef(pinned);
  if (pinned) lastPinned.current = pinned;
  const shownQuake = mapLayers.suspended ? undefined : (pinned ?? lastPinned.current);
  const quakeOverlay = !!(shownQuake && pinned && !explorerView.nearby);
  /* Must stay below the selection: the far-side figure is one of these marks and needs the pinned
  event's position, and it is gated on that event still being pinned - the toggle is in the panel, so
  dismissed, the arcs would have no explanation and no way off. */
  const traced = farSideOf && farSideOf === selected ? feed.store.get(farSideOf) : undefined;
  const tracedReading = traced?.primary;
  const farSide = useMemo(
    () => (tracedReading ? { lon: tracedReading.lon, lat: tracedReading.lat } : null),
    [tracedReading],
  );
  const quiet = useMemo(
    () =>
      segments.length
        ? boundarySummary(feed.store, filters, clockAt(), boundaryKmOf)
        : { note: null, parts: null },
    // New readings change this spatial tally under unchanged filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot.revision, filters, segments, boundaryKmOf, clockAt],
  );
  const hazards = useMemo(
    () => hazardGroups(onGlobe, minuteClock, archived),
    [onGlobe, archived, minuteClock],
  );
  const markSubject = !storm && !observatory.observing ? findSubject(markId, onGlobe) : null;
  const closeStorm = useCallback(() => {
    if (explorerView.destination === "storm") history.back();
    else {
      setMarkId(null);
      document.getElementById("globe-view")?.focus({ preventScroll: true });
    }
  }, [explorerView.destination]);
  const nearbyOrigin = explorerView.nearby?.record;
  const { selectMark, selectQuake } = useWorldSelection({
    onGlobe,
    observing: observatory.observing,
    enterExplore,
    camera,
    flyTo,
    nearbyOrigin,
    followStorm: followEnabled ? entrances.storm : undefined,
    setMarkId,
    setSelected,
    feed,
  });
  const marks = useMemo(
    () =>
      marksFor({
        ...onGlobe,
        farSide: mapLayers.suspended ? null : farSide,
        motion: motionOn && !mapLayers.suspended && !observatory.observing ? motionData : [],
        here: mapLayers.suspended ? null : here,
      }),
    [onGlobe, farSide, motionOn, motionData, here, observatory.observing, mapLayers.suspended],
  );
  useEffect(() => {
    // A refresh must not clear a selection still in the buffer.
    if (selected && !feed.store.get(selected)) setSelected(null);
  }, [selected, snapshot.revision]);

  useTimelinePlayback(
    scrub.playing && !mapLayers.suspended && !chase.frame && !observatory.observing,
    filters.windowMs,
    setScrub,
    snapshot.archive,
  );

  useExploreKeys({
    feed,
    windowMs: filters.windowMs,
    scrubAt: scrub.at,
    setScrub,
    stepDay,
    hasQuery: !!query,
    clearQuery: () => setQuery(""),
    sectionOpen: !!sectionLine,
    closeSection: () => setSectionLine(null),
    clearPins: () => {
      setMarkId(null);
      setSelected(null);
    },
    closeStorm: storm ? closeStorm : undefined,
  });

  const toggleSource = (id: SourceId): void => {
    reportAnalytics({ name: "source_filter_changed" });
    setFilters((f) => {
      const sources = new Set(f.sources);
      if (sources.has(id)) sources.delete(id);
      else sources.add(id);
      return { ...f, sources };
    });
  };

  /* The store hands events back in arrival order, which is right for eviction and wrong for a list headed
     "newest first". See ARCHITECTURE.md#srcapptsx. */
  const recent = useMemo(
    () => feed.store.newest(60, (q) => matches(q, filters, clockAt())),
    // A revision invalidates this selection of the newest arrivals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, snapshot.revision, clockAt],
  );

  // The later of the two feed edges, not the earlier: a corroboration rate needs the span where both
  // agencies had eyes on it.
  const overlapFrom =
    snapshot.covered.usgs !== null && snapshot.covered.emsc !== null
      ? Math.max(snapshot.covered.usgs, snapshot.covered.emsc)
      : null;

  const coverage = earthquakeCoverage(snapshot, filters, now);
  const { bars, strongest, bucketMs, energyShare, energyTotal, overlap, reported } = useMemo(
    () => histogram(feed.store.forEach, filters, now, coverage.from, overlapFrom),
    // `now` is absent on purpose: it ticks every second and the bars only move on a bucket boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.minMagnitude, filters.sources, filters.windowMs, snapshot.revision, coverage.from, overlapFrom],
  );

  // `now` is absent on purpose: a second passing does not change what matches a query, and depending on
  // it re-walks fifty thousand events every second.
  const results = useMemo(
    () => search(query, feed.store, filters, clockAt()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filters.minMagnitude, filters.sources, filters.windowMs, snapshot.revision],
  );

  const pick = (hit: Hit): void => {
    if (hit.kind === "region") {
      flyTo.current(hit.region.lon, hit.region.lat, hit.region.zoom);
      return;
    }
    setSelected(hit.strongest.key);
    flyTo.current(hit.strongest.primary.lon, hit.strongest.primary.lat, 2.2);
  };

  const clockBins = useMemo(
    () => diurnal(feed.store.forEach, filters, clockAt()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.minMagnitude, filters.sources, filters.windowMs, snapshot.revision],
  );

  /* A bucket is `windowMs / 24`, not an hour. Multiplying the index by an hour lit the same recent hour
  for every bar at a month. */
  const focusSpan = useMemo(
    () =>
      focusHour === null ? null : { from: now - (focusHour + 1) * bucketMs, to: now - focusHour * bucketMs },
    // `now` is absent for the reason the bars exclude it: it would re-sync the marker layer every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focusHour, bucketMs],
  );

  const sizes = useMemo(
    () => sizesOf(feed.store, filters, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed.store, filters, snapshot.revision],
  );
  const hours = Math.round(filters.windowMs / 3_600_000);
  // Counts what is on the globe, not what is in the buffer: dragging magnitude to 5.0 emptied the globe
  // and `stats.quakes` beside it stayed put. The strip spans exactly the window, so its total is the
  // window's total - one walk, one number, and the strip and the headline cannot disagree.
  const shown = totalIn(bars);
  const emptyEarthquakes = earthquakeEmpty({
    waiting: coverage.waiting || (archiveBusy && !archived),
    unavailable:
      !archived &&
      !archiveBusy &&
      [...filters.sources].every((id) => snapshot.statuses[id].kind === "failing"),
    reported,
    earlierUnavailable: !archived && !archiveBusy && coverage.from === null && !coverage.waiting,
    archived,
    partial: coverage.partial,
    hasSources: filters.sources.size > 0,
  });

  // `useRolling` is handed the animate-or-jump distinction rather than inferring it, because the two
  // cases look identical from the value alone.
  const driven = replay !== null || view.at !== null;
  const headline = useRolling(replay ? replay.revealed : (revealedNow ?? shown), !driven);

  const storyId = observatory.getMoment()?.id;
  const storyTitle = searchStories.find(({ id }) => id === storyId)?.title;
  useEffect(() => {
    const base = "meanwhile.";
    const day = snapshot.archive ? `${new Date(snapshot.archive.from).toISOString().slice(0, 10)} · ` : "";
    document.title = storyTitle
      ? `${storyTitle} · ${base}`
      : observatory.observing || replay || snapshot.coveredSince === null
        ? base
        : `(${headline.toLocaleString("en-GB")}) ${day}${base}`;
  }, [storyTitle, observatory.observing, headline, replay, snapshot.coveredSince, snapshot.archive]);
  stillCounts.current = {
    quakes: mapLayers.visible.earthquakes ? headline : 0,
    cyclones: onGlobe.cyclones.length,
    fires: fireSummary.count,
    firesCapped: fireSummary.count >= FEED_CAP,
    floods: onGlobe.floods.length,
  };

  /* A shared cursor the window cannot hold, or the recipient sees the present with no reason why. See ARCHITECTURE.md#srcapptsx. */
  const staleCursor = shared.cursor !== undefined && scrub.at === shared.cursor && view.at !== shared.cursor;

  const edge = windowStart(now, filters.windowMs, partialArchive ? null : snapshot.coveredSince);
  const near = useMemo(() => {
    if (replay || here === null) return null;
    return closestTo(feed.store, here, filters, clockAt(), view.at ?? clockAt());
    // The nearest event can change on a feed revision while the viewer stays still.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here, filters, snapshot.revision, replay, view.at, clockAt]);

  const [headOpen, setHeadOpen] = useStoredFlag("head", true);
  const railShown = !observatory.observing && railOpen;
  useWorldLayout(`${observatory.presentation}:${observatory.landing}`);
  const placePin = nearbyOrigin ?? explorerView.city?.city ?? place.point;
  const headShown = observatory.observing || headOpen || chromeFloats;

  const versus = useMemo(() => versusReference(energyTotal), [energyTotal]);

  const ceiling = useMemo(
    // As of the day on screen: an archived day must not be handed a record from its own future.
    () => superlativeFor(strongest, snapshot.archive ? snapshot.archive.from : clockAt()),
    [strongest, snapshot.archive, clockAt],
  );

  const baselineSpan: BaselineSpan | null =
    filters.windowMs === 24 * 3_600_000 ? "day" : filters.windowMs === 7 * 24 * 3_600_000 ? "week" : null;
  const baseline = useMemo(() => {
    if (replay) return null;
    if (snapshot.archive) {
      const { from, to } = snapshot.archive;
      return rankDay(comparableCount(feed.store, from, to), true, "day");
    }
    if (baselineSpan === null || !edge.complete) return null;
    /* The ranking ignores the magnitude filter on purpose - one a reader can change by dragging a slider is
       worse than none - but it must still stand down when the filter empties the screen. See ARCHITECTURE.md#srcapptsx. */
    if ((revealedNow ?? shown) <= 0) return null;
    return rankDay(comparableCount(feed.store, edge.at, now), true, baselineSpan);
    // Catalogue revisions affect the rank even when filters have not changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    snapshot.archive,
    snapshot.revision,
    baselineSpan,
    edge.complete,
    edge.at,
    now,
    replay,
    shown,
    revealedNow,
  ]);
  const feeds = feedStatus(snapshot.statuses, answered, { ...snapshot.checked, ...checked }, mapLayers.feeds);

  const marksFilter = (
    <MagnitudeFilter
      ramp={ramp}
      value={filters.minMagnitude}
      onChange={(v) => setFilters((f) => ({ ...f, minMagnitude: v }))}
      aurora={onGlobe.aurora}
      cyclones={onGlobe.cyclones}
      volcanoes={onGlobe.volcanoes.length}
      outsideWindow={outsideWindowNote(hazardTally, now)}
      volcanoesSince={newestEpisode(volcanoes)}
      // Use the archived day's clock so volcano ages do not advance with today.
      now={now}
      fires={fireSummary}
      fireCap={FEED_CAP}
      floods={onGlobe.floods.length}
      floodCountries={countries(onGlobe.floods)}
      keyOpen={keyOpen}
      onKeyOpen={setKeyOpen}
      archived={archived}
      motion={motion}
      depth={depth}
      sound={sound ? announceAbove : null}
      motionOn={motionOn}
      onMotion={setMotionOn}
      sinkOn={flat ? null : sinkOn}
      onSink={onSink}
      cutawayOn={flat ? null : cutaway !== null}
      onCutaway={onCutaway}
      herePlace={here?.label ?? null}
      sky={!flat}
      eclipse={flat ? null : eclipse}
      figuresOn={flat ? null : figuresOn}
      onFigures={setFiguresOn}
      slabOn={slabOn}
      onSlab={setSlabOn}
      slabCount={slabData.length}
    >
      <SourceFilter sources={filters.sources} toggleSource={toggleSource} />
    </MagnitudeFilter>
  );

  const marksKey =
    !observatory.observing &&
    hasLegendMarks(mapLayers.visible.earthquakes, onGlobe) &&
    !section &&
    !markSubject &&
    !quakeOverlay
      ? cloneElement(marksFilter, { part: "embedded-key", earthquakeMarks: mapLayers.visible.earthquakes })
      : null;

  const { rows: reaches, note: sourceNote } = earthquakeReach(snapshot, now, filters.windowMs);
  const timelineNotes = [sourceNote, corroborationNote(overlap, overlapFrom, now, filters.windowMs)].filter(
    (n): n is string => n !== null,
  );
  const changeWindow = (h: number) => {
    const windowMs = h * 3_600_000;
    setFilters((f) => ({ ...f, windowMs }));
    setScrub(LIVE);
    if (feed.setWindow(windowMs)) setPendingRev(snapshot.revision);
  };
  const timeline = (
    <div data-activity>
      <Timeline
        bars={bars}
        onSelect={selectQuake}
        archived={archived}
        ramp={ramp}
        hours={hours}
        focusHour={focusHour}
        onFocusHourChange={setFocusHour}
        onHoursChange={changeWindow}
        bucketMs={bucketMs}
        fetching={fetching}
        empty={emptyEarthquakes.short}
        cursor={fractionOf(view, span)}
        parked={view.at !== null}
        playing={view.playing}
        onScrub={(f) => setScrub(dragTo(f, span))}
        onStep={(buckets) => setScrub(nudge(view, span, buckets))}
        onPlayToggle={() => setScrub(togglePlay(view, span))}
        onLive={() => setScrub(LIVE)}
        cursorLabel={viewClock}
        reaches={reaches}
        notes={timelineNotes}
      >
        <details className="mt-3">
          <summary className="disclose text-[11px] text-faint hover:text-dim">
            Earthquakes by magnitude
          </summary>
          <SizeChart sizes={sizes} />
        </details>
      </Timeline>
    </div>
  );
  const archiveControls = (
    <ArchiveControls
      archive={snapshot.archive}
      state={archiveState}
      openStory={observatory.openRecordedStory}
      onCursor={(at) => setScrub({ at, playing: false })}
      watchEclipse={
        flat
          ? "Switch to Globe to watch."
          : !observatory.ready
            ? "Waiting for the globe."
            : (event) => {
                if (chase.frame) return chase.close(true);
                onCutaway(false);
                setFilters((current) =>
                  current.windowMs >= 86_400_000 ? current : { ...current, windowMs: 86_400_000 },
                );
                chase.start(camera.current, event.currentTarget);
              }
      }
    />
  );
  const regionalResults = (
    <RegionalResults
      {...{ flat, results, regionsHeight, pick }}
      query={mapLayers.enabled.earthquakes ? query : ""}
      regions={mapLayers.enabled.earthquakes ? regions : []}
      empty={
        emptyEarthquakes.kind === "loading" || emptyEarthquakes.kind === "unavailable"
          ? emptyEarthquakes.text
          : null
      }
      onRegion={(region) => flyTo.current(region.lon, region.lat, region.zoom)}
      onResize={setRegionsHeight}
    />
  );
  const observatoryProps: ObservatoryProps = {
    explorer: {
      radarAt: mapLayers.radarAt,
      ...explorerCamera(readCamera, flyTo, flat, setFlat),
      radarTime: (at) => mapLayers.selectTime("radar", at),
    },
    discoveries: {
      now: minuteClock,
      quake:
        !archived &&
        view.at === null &&
        journey.stops[0]?.reading &&
        snapshot.statuses[journey.stops[0].reading.source].kind !== "failing"
          ? (journey.stops[0] ?? null)
          : null,
      inspect: selectQuake,
    },
    scene: observatory.scene,
    at: overflight.run?.forecast.forecastAt ?? litAt ?? minuteClock,
    ready: observatory.ready,
    summary:
      shown === 0 && emptyEarthquakes.kind !== "empty"
        ? emptyEarthquakes.text
        : observatorySummary(shown, filters, coverage, loadedDay),
    feedNote: observatoryFeedNote(snapshot.statuses, feeds.silent),
    deepAvailable: journey.deepest !== null,
    onScene: chooseEarthScene,
    onHome: returnHome,
    onExplore: entrances.open,
    explorePaths: entrances,
    aurora: overflight,
    views: observatory,
    radar: observatory.radar,
    layerReadout: <LayerReadout controls={mapLayers} />,
    onHistory: (day) => {
      stopTour();
      enterExplore();
      mapLayers.inspect("earthquakes");
      observatory.browser.show("layers");
      const eclipseDay = day === APRIL_ECLIPSE_DAY;
      historyIntent.current = eclipseDay ? null : day;
      if (eclipseDay) setFlat(false);
      setScrub(LIVE);
      setSectionLine(null);
      void archiveState.loadArchive(day);
    },
    tour: {
      at: tourAt,
      stop: touring,
      length: tourLength,
      paused: tourPaused,
      button: tourButton,
      controls: tourControls,
      start: startTour,
      stopTour,
      next: nextTour,
      previous: previousTour,
      pause: togglePause,
      available: journey.stops.length > 0,
      inspect:
        touring?.key && feed.store.get(touring.key)
          ? () => {
              const key = touring.key!;
              stopTour();
              enterExplore();
              selectQuake(key);
            }
          : null,
    },
  };
  const quakeDetail =
    shownQuake && !observatory.observing ? (
      <DetailPanel
        open={pinned !== undefined && !inspection.run}
        inline={!!nearbyOrigin}
        quake={shownQuake}
        store={feed.store}
        filters={filters}
        ramp={ramp}
        excluded={!matches(shownQuake, filters, now)}
        revision={snapshot.revision}
        now={now}
        archived={archived}
        onClose={() => closeReading("quake")}
        onRupture={() => observatory.openRecordedStory("rupture", "event-story-rupture")}
        onInspect={
          observatory.ready
            ? (run, opener) => {
                setFlat(false);
                onCutaway(false);
                setFarSideOf(null);
                setScrub((current) => (current.playing ? { ...current, playing: false } : current));
                inspection.start(run, opener);
              }
            : null
        }
        onSection={(line) => {
          setSectionLine(line);
          setFlat(true);
          flyTo.current(shownQuake.primary.lon, shownQuake.primary.lat, 1.6);
        }}
        boundaryKm={boundaryKmOf(shownQuake)}
        onSelect={selectQuake}
        farSide={farSideOf === shownQuake.key}
        onFarSide={(on) => {
          setFarSideOf(on ? shownQuake.key : null);
          if (on) flyTo.current(shownQuake.primary.lon, shownQuake.primary.lat, 0.9);
        }}
      />
    ) : null;
  const { tonight, observations, browser } = observatory;
  const localSky = tonight.active && !tonight.orbit && !observations.map && !tonight.view?.moonfall;
  const fold = <ExplorerFold open={railOpen} pane={browser.pane} onChange={setRailOpen} />;
  return (
    <StoryNavigation {...observatoryProps}>
      <main
        className="frame"
        data-presentation={observatory.presentation}
        data-landing={observatory.landing || undefined}
        data-tonga-opening={observatory.observations.entry === "tonga" || undefined}
      >
        <SkipControls observing={observatory.observing} railShown={railShown} />
        <h1 className="sr-only">meanwhile.</h1>
        <GlobeHeader
          keyboard={
            <KeyboardHelp
              flat={flat}
              localSky={localSky}
              playing={view.playing}
              archived={archived}
              clearable={Boolean(query || sectionLine || view.at !== null || selected || markId)}
            />
          }
          clip={clip}
          rotation={observatory.rotation}
          ready={observatory.canCapture && mapLayers.canCapture}
          observing={observatory.observing}
          landing={observatory.landing}
          localSky={localSky}
          onHome={returnHome}
          home={home}
          onReset={resetView}
          {...{
            headShown,
            chromeFloats,
            setHeadOpen,
            snapshot,
            flat,
            setFlat,
            saving,
            saveStill,
            feeds,
            notice,
            download,
            dismiss,
          }}
        />
        <div
          className="zones"
          style={
            {
              ...(headShown ? {} : { "--head-h": "0px" }),
              "--explorer-width": `${railWidth}px`,
              "--rail-panel-w": railShown ? "var(--explorer-width)" : "0px",
              "--regions-h": `${regionsHeight}px`,
              ...(sheetCanvas > 0 ? { "--canvas-h": `${sheetCanvas}px` } : {}),
            } as React.CSSProperties
          }
        >
          {observatory.observing ? <Observatory {...observatoryProps} /> : null}
          {observatory.observing ? null : (
            <ExploreSheet
              {...{ flat, height: sheetCanvas }}
              layersOverview={observatory.browser.pane === "layers" && !mapLayers.inspector}
              onResize={setSheetCanvas}
              visible={railShown && !markSubject && !quakeOverlay}
            />
          )}
          <aside
            aria-label="Map layers and recent activity"
            id="chrome-rail"
            tabIndex={-1}
            className="zone-rail rail border-hairline p-5 max-md:border-b md:border-r"
            hidden={!railShown}
          >
            <ExplorerSidebar
              context={observatoryProps}
              fold={railShown ? fold : null}
              notices={
                <ExploreNotices
                  {...{ archived, loadedDay, archiveBusy, staleCursor, snapshot, archiveHazards, answered }}
                  silent={feeds.silent}
                  cursor={view.at}
                  missingQuake={pinned ? null : missingShared}
                  missingMark={markId === shared.mark && !markSubject && !storm ? markId : null}
                />
              }
            >
              {archived && mapLayers.inspector !== "earthquakes" && archiveControls}
              {explorerView.city && (
                <CityWeatherReading
                  visit={explorerView.city}
                  controls={mapLayers}
                  change={explorerView.changeCityLayer}
                  back={entrances.backToSky}
                />
              )}
              <MapLayers
                storm={storm}
                onCloseStorm={closeStorm}
                cityWeather={!!explorerView.city}
                places={{
                  ready: observatory.ready,
                  feed,
                  filters: explorerView.nearby ? filters : mapLayers.globeFilters,
                  at: view.at ?? now,
                  now,
                  revision: snapshot.revision,
                  hazards,
                  feeds,
                }}
                place={{
                  ...place,
                  cutaway: nearbyOrigin,
                  backToCutaway: entrances.back,
                  allLayers: entrances.allLayers,
                  reading: nearbyOrigin && pinned && !inspection.run ? quakeDetail : null,
                  closeReading: readings.closeQuake,
                }}
                readCamera={readCamera.current}
                panelVisible={railShown}
                onQuake={selectQuake}
                controls={{
                  ...mapLayers,
                  change: (layer, on) => {
                    mapLayers.change(layer, on);
                    if (!on && layer === "earthquakes") {
                      setSelected(null);
                      setSectionLine(null);
                    }
                    if (!on && markBelongsToLayer(markId, layer)) setMarkId(null);
                  },
                }}
                feeds={feeds}
                aurora={onGlobe.aurora}
                archived={archived || archiveBusy}
                markId={markId}
                onHazard={selectMark}
                flat={flat}
                canDismiss={
                  !query && !sectionLine && scrub.at === null && !selected && !markId && tourAt === null
                }
                window={
                  <LayerWindow
                    hours={hours}
                    onChange={changeWindow}
                    held={view.at !== null}
                    onLive={() => setScrub(LIVE)}
                  />
                }
              >
                {archived && mapLayers.inspector === "earthquakes" && archiveControls}
                {mapLayers.enabled.earthquakes && (
                  <EarthquakeInspector
                    stats={snapshot.stats}
                    discovery={<EarthquakeDiscovery context={observatoryProps} />}
                    options={
                      <EarthquakeOptions ramp={ramp} setRamp={setRamp} sound={sound} setSound={setSound} />
                    }
                    headline={{
                      time: archived
                        ? `Archive · ${loadedDay ?? archiveDay} UTC`
                        : view.at === null
                          ? "Live"
                          : view.playing
                            ? "Replaying"
                            : `Paused at ${viewClock}`,
                      loading:
                        snapshot.coveredSince !== null
                          ? null
                          : earthquakeFeedsDown
                            ? "Neither feed is answering yet."
                            : archiveBusy && archiveDay
                              ? `Asking USGS and EMSC for ${archiveDay}.`
                              : `Loading earthquake reports for the last ${compactSpan(filters.windowMs)}…`,
                      count: headline,
                      coverage: coverage.label,
                      moment: replay ? clock(replay.at) : viewClock,
                      replaying: !!replay || view.playing,
                    }}
                    filters={marksFilter}
                    timeline={timeline}
                    query={{
                      value: query,
                      change: setQuery,
                      pickFirst: () => {
                        const first = results.hits[0];
                        if (first) pick(first);
                      },
                    }}
                    clockBins={clockBins}
                    regionalResults={regionalResults}
                    list={{
                      quakes: recent,
                      selected: selected,
                      onSelect: selectQuake,
                      announceAbove: announceAbove,
                      onAnnounceAboveChange: setAnnounceAbove,
                      onNews: onNews,
                      empty: emptyEarthquakes,
                      now: now,
                      archived: archived,
                      onClearFilters: () => {
                        setFilters((current) => ({
                          ...current,
                          minMagnitude: DEFAULT_FILTERS.minMagnitude,
                          sources: new Set(DEFAULT_FILTERS.sources),
                        }));
                        document.getElementById("mag")?.focus();
                      },
                    }}
                  />
                )}
                {(!query || !mapLayers.enabled.earthquakes) && regionalResults}
                {!archived && archiveControls}
                <details className="context-fold" hidden={!mapLayers.enabled.earthquakes}>
                  <summary className="disclose text-dim">More context</summary>
                  {!replay && !flat && (
                    <EarthquakeContext
                      strongest={strongest}
                      percent={quiet.parts?.percent ?? null}
                      shown={shown}
                      empty={emptyEarthquakes.short}
                      now={now}
                      archived={archived}
                      ramp={ramp}
                      onLargest={() => {
                        if (!strongest) return;
                        setSelected(strongest.key);
                        flyTo.current(strongest.primary.lon, strongest.primary.lat, 1.9);
                        setScrub(clampScrub({ at: strongest.primary.time, playing: false }, span));
                      }}
                    />
                  )}
                  {!replay && quiet.note ? (
                    <div className="tb-notes">
                      <span className="label">Notes</span>
                      <p className="text-[11px] leading-relaxed text-faint">{quiet.note}</p>
                    </div>
                  ) : null}
                  <EarthquakeComparisons
                    energyShare={strongest && !replay && edge.complete ? energyShare : null}
                    baseline={baseline}
                    baselineSpan={baselineSpan}
                    ceiling={
                      strongest && !replay && edge.complete && (revealedNow ?? shown) > 0 ? ceiling : null
                    }
                    versus={!replay && edge.complete ? versus : null}
                  />
                  {near && here && <NearbyEarthquake near={near} label={here.label} />}
                </details>
              </MapLayers>
            </ExplorerSidebar>
          </aside>
          {!observatory.observing && !railShown && fold}
          <Resizer
            axis="x"
            label="Rail width"
            value={railWidth}
            min={RAIL_MIN}
            max={RAIL_MAX}
            measure={(e) => e.clientX - 24}
            onChange={setRailWidth}
            className={railShown ? "explorer-resize absolute hidden xl:block" : "hidden"}
            style={{ left: "calc(var(--rail-w) - 18px)" }}
          />
          <section
            id="globe-view"
            tabIndex={-1}
            aria-label={flat ? "Map" : "Globe"}
            className="zone-canvas relative bg-void"
          >
            <Suspense fallback={<GlobeLoading />}>
              <Globe
                feed={feed}
                filters={mapLayers.globeFilters}
                selected={observatory.localReadings || !mapLayers.visible.earthquakes ? null : selected}
                ramp={ramp}
                focus={focusSpan}
                aurora={observatory.observations.entry ? null : (overflight.run?.forecast ?? onGlobe.aurora)}
                marks={marks}
                scrubAt={view.at}
                moment={overflight.run?.forecast.forecastAt ?? chase.frame ?? litAt}
                inspection={inspection.run}
                flat={flat}
                globePresentation={mapLayers.compose(observatory.globe(tourAt !== null))}
                landing={observatory.landing}
                rotateLanding={observatory.rotation.enabled}
                depthSink={observatory.depth || sinkOn}
                cutaway={observatory.observing ? observatory.depthFocus : flat ? null : cutaway}
                slab={
                  ((!observatory.observing && slabOn) || observatory.depth) && slabData.length > 0
                    ? slabData
                    : null
                }
                figures={
                  ((!observatory.observing && figuresOn) || observatory.night) && figureData.length > 0
                    ? figureData
                    : null
                }
                section={sectionLine}
                {...observatoryBackdrop(observatory)}
                onSection={(line, hinge) => setSectionLine(line && hinge ? { ...line, hinge } : line)}
                onSelect={selectQuake}
                onReady={onReady}
                onCapture={onCapture}
                {...(clip.recording ? { onFrame: clip.onFrame } : {})}
                onSelectMark={selectMark}
                placePin={observatory.observing || mapLayers.suspended ? null : placePin}
                onPlace={
                  !observatory.observing &&
                  !mapLayers.suspended &&
                  !mapLayers.rewindPoint &&
                  !explorerView.nearby &&
                  !explorerView.city &&
                  !selected &&
                  !markId
                    ? place.open
                    : undefined
                }
                onCamera={(state) => {
                  camera.current = state;
                  observeTourCamera(state);
                }}
                onReplay={receiveReplay}
              />
            </Suspense>
            <div className="canvas-information pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex flex-wrap items-end justify-start gap-x-6 gap-y-3 p-4 md:left-[var(--rail-w)]">
              {!observatory.observing && <LayerReadout controls={mapLayers} withLegend legend={marksKey} />}

              <EclipseReplayControls playback={chase} />
              <WaveReplayControls replay={inspection} />
              <SequenceReplayControls replay={inspection} />
              {section && !observatory.observing && !chase.frame && !inspection.run ? (
                <CrossSection
                  data={section}
                  hinge={sectionLine?.hinge}
                  inset={Boolean(markSubject || quakeOverlay)}
                  ramp={ramp}
                  store={feed.store}
                  selected={selected}
                  onSelect={selectQuake}
                  onClose={() => closeReading("section")}
                />
              ) : null}
            </div>
          </section>

          {!headShown && <CanvasStamp cursor={view.at} day={snapshot.archive?.from ?? null} />}

          {markSubject ? (
            <MarkCard
              found={markSubject}
              now={now}
              archived={archived}
              onClose={() => closeReading("hazard")}
            />
          ) : explorerView.nearby ? null : (
            quakeDetail
          )}
        </div>
      </main>
    </StoryNavigation>
  );
}
