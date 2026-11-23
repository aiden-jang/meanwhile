import { radarActions } from "./radar/radarActions";
import type { CameraState } from "../globe/controlsTypes";
import { appendJourney, auroraMoment, useLinkedAurora, useRouteExtension } from "./useLinkedAurora";
import { useSunVisit } from "./sun/useSunVisit";
import { useCallback, useRef, useState } from "react";
import type { Permalink } from "./permalink";
import { initialPresentation, initialScene, linkedPose } from "./observatoryState";
export { initialPresentation, earthSceneTarget } from "./observatoryState";
import type { Stop } from "./tour";
import type { CutawayFocus } from "../globe/cutaway";
import type { AuroraRun } from "../sources/auroraRoute";
import { useObservationDeck, type AfterDarkArchive } from "./observations/useObservationDeck";
import type { ReplayId } from "./observations/replays";
import type { FloatDiveView } from "./float/floatPlayback";
import { skyReference, useSkyView } from "./useSkyView";
import { createFloatPlayback } from "./float/floatPlayback";
import { useSkyCity } from "./tonight/SkyCityPicker";
import type { GlobePresentation } from "../globe/scenePresentation";
import { captureRadarView, radarLink, radarMoment, type RadarEntry } from "./radar/radarCamera";
import { useRadarPresentation } from "./radar/useRadarPresentation";
import { usePresentation } from "./usePresentation";
import { useStoredFlag } from "./useStored";
import { isSkyStory } from "./tonight/skyMoment";
import { useFloatView } from "./float/useFloatView";
import { useDepthCutaway } from "./recordedCutaway";

export type EarthScene = "live" | "depth" | "night";
export type Presentation = "observe" | "explore";
export function useObservatory(shared: Partial<Permalink>) {
  const story = shared.story;
  const checkpoint = useRef<() => void>(() => {});
  const routeExtension = useRouteExtension();
  const loadingBackdrop = useRef<"dayline" | "planetarium">("dayline");
  const visitCheckpoint = useRef<() => void>(() => {});
  const before = useCallback(() => {
    visitCheckpoint.current();
    checkpoint.current();
  }, []);
  const [scene, setScene] = useState(() => initialScene(shared));
  const [tourStop, setTourStop] = useState<Stop | null>(null);
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState<AuroraRun | null>(null);
  const { request: auroraRequest, set: requestAurora } = useLinkedAurora(story);
  const { visit: sunWatch, setVisit: setSunWatch, ...sun } = useSunVisit(before, setRun, story);
  const skyCity = useSkyCity(shared.story?.city);
  const sky = useSkyView(skyCity.name, before, story);
  const { view: tonightView, entry: skyEntry, setView: setTonightView } = sky;
  const {
    entry: floatEntry,
    view: floatView,
    setView: setFloatView,
    controls: floatDive,
    moment: getFloatMoment,
  } = useFloatView(shared.story, before, linkedPose(shared));
  const {
    view: radarView,
    setView: setRadarView,
    update: updateRadar,
    opening: radarOpening,
  } = useRadarPresentation(story, linkedPose(shared));
  const observations = useObservationDeck(
    story && !["float", "radar", "aurora", "sun"].includes(story.id) && !isSkyStory(story.id)
      ? story
      : undefined,
    before,
    story?.map ?? (shared.depthEvent ? shared.flat : undefined),
    story ? linkedPose(shared) : undefined,
  );
  const cutaway = useDepthCutaway(shared, tourStop, observations);
  const { focus, setFocus, depthFocus } = cutaway;
  const closeDeck = observations.close;
  const radarEntry = useRef<RadarEntry>(story?.id === "radar" ? radarLink(story, linkedPose(shared)) : {});
  const radarOrigin = useRef<Presentation>("observe");
  const storyFromExplore = useRef(false);
  const clearViews = useCallback(() => {
    setTourStop(null);
    setRun(null);
    requestAurora(null);
    setSunWatch(null);
    setRadarView(null);
    setTonightView(null);
    setFloatView(null);
    closeDeck();
    storyFromExplore.current = false;
  }, [closeDeck, setTonightView, setRadarView, setFloatView, setSunWatch, requestAurora]);
  const {
    presentation,
    changePresentation,
    enterExplore,
    enterObserve,
    exploreScene,
    observeScene,
    restore: restorePresentation,
    requestExploreFocus,
  } = usePresentation(() => initialPresentation(shared), clearViews, before);
  const [browser, setBrowser] = useState({
    open: !!shared.story || !!shared.catalogue,
    expanded: null as string | null,
    sections: [] as string[],
    pane: shared.catalogue ? ("stories" as const) : ("layers" as "layers" | "stories"),
    category: shared.story ? scene : shared.catalogue === "all" ? null : (shared.catalogue ?? null),
  });
  const browserScroll = useRef(0);
  const sharedView = useRef(shared.lon !== undefined || !!shared.day || shared.cursor != null);
  const [rotation, setRotation] = useStoredFlag("landingRotation", true);
  const chooseScene = useCallback(
    (next: EarthScene, at: CutawayFocus | null = null, keepDeck = false, open?: () => void) => {
      before();
      setScene(next);
      setBrowser((value) => ({
        ...value,
        open: true,
        category: value.open && value.category === null ? null : next,
      }));
      setFocus(at);
      setTourStop(null);
      setRun(null);
      requestAurora(null);
      setSunWatch(null);
      setRadarView(null);
      setTonightView(null);
      setFloatView(null);
      if (!keepDeck) closeDeck();
      open?.();
    },
    [closeDeck, before, setTonightView, setRadarView, setFloatView, setSunWatch, requestAurora, setFocus],
  );
  const radar = radarActions(
    { radarView, radarOrigin, radarEntry, setRadarView, updateRadar },
    { presentation, before, changePresentation, setScene, observations },
  );
  const observing = presentation === "observe";
  const night = observing && scene === "night";
  const sunActive = night && sunWatch !== null;
  const tonight = night && tonightView !== null;
  const localSky = tonight && tonightView !== "opening" ? tonightView : null;
  const auroraRun = night && !tonight ? run : null;
  const depth = observing && !observations.entry && (tourStop?.purpose === "depth" || scene === "depth");
  const origin = {
    presentation,
    radar: radarOrigin.current,
    entry: radarEntry.current,
    story: storyFromExplore.current,
    shared: sharedView.current,
  };
  const capture = (camera?: CameraState) => ({
    scene,
    extension: routeExtension.current.capture(),
    auroraRequest,
    skyCity: skyCity.name,
    focus,
    run: run && !run.held ? { ...run, held: true as const } : run,
    sunWatch: sunWatch ? { ...sunWatch, ...sun.selection(), position: sun.moment(observations.map) } : null,
    browser,
    origin,
    sky: sky.capture(),
    deck: observations.capture(camera),
    float:
      floatView === "opening"
        ? { opening: true as const, entry: floatEntry.current }
        : floatView === null
          ? null
          : floatView.checkpoint(camera ?? floatView.target),
    radar: captureRadarView(radarView, camera),
  });
  const entranceVisits = useRef<Partial<Record<EarthScene, ReturnType<typeof capture>>>>({});
  return {
    entranceVisits,
    observing,
    landing:
      observing &&
      scene === "live" &&
      !(browser.open || tourStop || floatView || radarView || observations.entry),
    browsingStories: !observing
      ? browser.pane === "stories"
      : browser.open &&
        !tourStop &&
        !sunActive &&
        !auroraRun &&
        !auroraRequest &&
        !tonight &&
        !floatView &&
        !radarView &&
        !depthFocus?.archiveReading &&
        !observations.entry,
    backgroundLayers:
      !observing || (scene === "live" && !depth && !observations.entry && !floatView && !radarView),
    presentation,
    rotation: { enabled: rotation, set: setRotation },
    browser: {
      ...browser,
      scroll: browserScroll,
      expand: (expanded: string | null) => setBrowser((value) => ({ ...value, expanded })),
      fold: (id: string, open: boolean) =>
        setBrowser((value) =>
          value.sections.includes(id) === open
            ? value
            : {
                ...value,
                sections: open ? [...value.sections, id] : value.sections.filter((key) => key !== id),
              },
        ),
      show: (pane: "layers" | "stories") => {
        before();
        setBrowser((value) => ({ ...value, pane }));
      },
      select: (category: EarthScene | null) => {
        before();
        setBrowser((value) => ({ ...value, open: true, category }));
      },
    },
    checkpoint,
    visitCheckpoint,
    home(prepare: () => void) {
      before();
      sharedView.current = false;
      browserScroll.current = 0;
      observations.setQuery("");
      observeScene(() => {
        chooseScene("live");
        setBrowser((value) => ({ ...value, open: false, category: null }));
        prepare();
      });
    },
    navigation: {
      requestExploreFocus,
      extension: routeExtension,
      linkedJourney: story?.journey,
      prepareStory: (next: EarthScene, keepDeck: boolean, open?: () => void) => {
        loadingBackdrop.current = night ? "planetarium" : "dayline";
        if (observing) chooseScene(next, null, keepDeck, open);
        else changePresentation("observe", true, () => chooseScene(next, null, keepDeck, open), false);
      },
      key: [
        presentation,
        observing ? "observe" : browser.pane,
        scene,
        `${browser.open}:${browser.category ?? "all"}`,
        observations.entry ??
          (tonight
            ? sky.historyKey(!!localSky?.lunarDeparture, observations.map)
            : sunActive
              ? "sun"
              : floatView
                ? "float"
                : radarView
                  ? "radar"
                  : auroraRun || auroraRequest
                    ? "aurora"
                    : ""),
      ].join(":"),
      capture,
      restore(saved: ReturnType<typeof capture>) {
        restorePresentation(saved.origin.presentation, () => {
          radarOrigin.current = saved.origin.radar;
          radarEntry.current = saved.radar
            ? {
                ...saved.origin.entry,
                ...radarLink(radarMoment(saved.radar, saved.deck.map), saved.radar.target),
              }
            : saved.origin.entry;
          storyFromExplore.current = saved.origin.story;
          sharedView.current = saved.origin.shared;
          setScene(saved.scene);
          setFocus(saved.focus);
          setTourStop(null);
          setRun(saved.run);
          requestAurora(saved.auroraRequest);
          skyCity.restore(saved.sky.view || saved.deck.entry ? saved.skyCity : undefined);
          setSunWatch(saved.sunWatch);
          sky.restore(saved.sky);
          let float: FloatDiveView | "opening" | null = null;
          if (saved.float && "opening" in saved.float) float = "opening";
          else if (saved.float) {
            float = createFloatPlayback(saved.float.profile, false, saved.float.source, saved.float);
          }
          floatEntry.current = saved.float && "opening" in saved.float ? saved.float.entry : undefined;
          setFloatView(float);
          setRadarView(saved.radar);
          setBrowser(saved.browser);
          observations.restore(saved.deck);
          saved.extension?.();
        });
      },
    },
    scene,
    ready,
    canCapture:
      ready &&
      !sunActive &&
      tonightView !== "opening" &&
      floatView !== "opening" &&
      (!radarView || (!!radarView.image && radarView.at === radarView.selectedAt)) &&
      (!observations.entry ||
        (!!observations.view && observations.view.capture !== false && !observations.view.frame.photograph)),
    localReadings:
      !!auroraRun ||
      !!auroraRequest ||
      sunActive ||
      radarView !== null ||
      tonight ||
      floatView !== null ||
      (depth && !!depthFocus?.archiveReading) ||
      !!observations.entry,
    observations,
    getMoment: () =>
      appendJourney(
        (sunActive ? sun.moment(observations.map) : null) ??
          (radarView ? radarMoment(radarView, observations.map) : null) ??
          sky.moment(observations.map) ??
          getFloatMoment(observations.map) ??
          observations.getMoment() ??
          auroraMoment(auroraRun, auroraRequest, observations.map),
        routeExtension.current.journey(),
      ),
    openRecordedStory(id: ReplayId | "kilauea" | "iceberg", from: string) {
      if (observing) observations.open(id, from);
      else
        changePresentation(
          "observe",
          true,
          () => {
            storyFromExplore.current = true;
            setScene("live");
            observations.open(id, from);
          },
          false,
        );
    },
    closeStory() {
      if (storyFromExplore.current) changePresentation("explore", true, undefined, false);
      else observations.close();
    },
    openAfterDarkArchive(archive: AfterDarkArchive) {
      loadingBackdrop.current = "planetarium";
      setRun(null);
      setSunWatch(null);
      observations.open(archive, archive === "lights" ? "open-lights-return" : "open-shadow-chase");
    },
    skyCity,
    viewAt: (observations.view?.frame.timeLabel ? undefined : observations.view?.frame.at) ?? localSky?.at,
    setReady,
    chooseScene,
    enterExplore,
    enterObserve,
    exploreScene,
    observeScene,
    depth,
    depthFocus: depth ? depthFocus : null,
    selectDepth: cutaway.selectDepth,
    sweepDepth: cutaway.sweepDepth,
    night,
    aurora: {
      run: auroraRun,
      request: auroraRequest,
      setRequest: requestAurora,
      setRun: (next: AuroraRun | null) => {
        before();
        setRun(next);
        if (!next) requestAurora(null);
      },
    },
    sun: { ...sun, active: sunActive },
    tonight: {
      ...sky,
      active: tonight,
      view: localSky,
      open(...args: Parameters<typeof sky.open>) {
        before();
        sky.open(...args);
        setRun(null);
        requestAurora(null);
        setSunWatch(null);
      },
      close: () => {
        before();
        setTonightView(null);
      },
    },
    floatDive,
    radar,
    globe(guided: boolean): GlobePresentation {
      if (observations.entry) return observations.view ?? auroraRun ?? loadingBackdrop.current;
      if (floatView === "opening" || radarOpening) return loadingBackdrop.current;
      if (night) {
        if (tonightView === "opening" && skyEntry.nightfall) return "dayline";
        if (localSky && (observations.map || sky.orbit) && !localSky.moonfall && !localSky.lunarDeparture)
          return skyReference(localSky);
        return localSky ?? auroraRun ?? (sunActive ? null : "planetarium");
      }
      return observing && scene === "live" && !guided
        ? (floatView ?? radarView ?? (sharedView.current ? "dayline" : "landing"))
        : null;
    },
    setTourStop,
  };
}
