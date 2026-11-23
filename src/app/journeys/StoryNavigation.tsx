import type { BrowseOrigin, StoryNavigationValue } from "./storyNavigationTypes";
import { usePanelReturn } from "../usePanelReturn";
import { visitAction, restartVisit } from "../visitor/visitAction";
import { refreshAnnotations } from "../../globe/annotationInput";
import { useJourneyAnalytics } from "../visitor/useJourneyAnalytics";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ObservatoryProps } from "../Observatory";
import { searchStories } from "../storyIndex";
import { storyPlace, type StoryPlace } from "../discovery/places";
import { featuredStoryId, storyButtonId } from "../storyBrowse";
import type { StoryId } from "../observations/useObservationDeck";
import { currentRadarRegion, isGlobalRadar } from "../radar/radarCamera";
import { useVisitMemory } from "../visitor/useVisitMemory";
import type { Visit } from "../visitor/library";
import type { SkyPosition } from "../tonight/skyMoment";
import { captureCollection, type CollectionPosition } from "../visitor/collectionReturn";
import { openSkyStory } from "./openSkyStory";
import type { JourneyArrival } from "./connectedStops";
import { useJourneyNavigation } from "./useJourneyNavigation";
import { auroraHandoff } from "./auroraJourney";
import { openAuroraStory } from "./openAuroraStory";

const Navigation = createContext<StoryNavigationValue | null>(null);

export const useStoryNavigation = () => useContext(Navigation);

export function StoryNavigation({ children, ...props }: ObservatoryProps & { children: ReactNode }) {
  const panelReturn = usePanelReturn();
  const [restoredCollection, setRestoredCollection] = useState<CollectionPosition | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [completion, setCompletion] = useState<{ id: string; complete: boolean } | null>(null);
  const reportCompletion = useCallback((id: string, complete: boolean) => {
    setCompletion((previous) =>
      previous?.id === id && previous.complete === complete ? previous : { id, complete },
    );
  }, []);
  const previewOrigin = useRef<{
    camera: ReturnType<ObservatoryProps["explorer"]["read"]>;
    flat: boolean;
    journey: boolean;
    place?: StoryPlace | undefined;
  } | null>(null);
  const origin = useRef<BrowseOrigin | null>(null);
  const { observations: deck, tonight, sun, floatDive } = props.views;
  const active =
    deck.entry ??
    (floatDive.active
      ? "float"
      : props.radar.active
        ? "radar"
        : tonight.active
          ? tonight.view?.lunarDeparture || tonight.view?.moonfall
            ? "moonfall"
            : tonight.view?.radiantTrail
              ? "meteors"
              : tonight.entry.mode
          : sun.active
            ? "sun"
            : props.aurora.run || props.aurora.requested
              ? "aurora"
              : null);
  useJourneyAnalytics(active);
  const checkpointJourney = useRef<() => void>();
  const memory = useVisitMemory(props, active, completion?.id === active && completion.complete, () =>
    checkpointJourney.current?.(),
  );
  useEffect(() => {
    if (active === null) origin.current = null;
  }, [active]);
  const unavailable = (id: string) =>
    !props.ready ? "Story playback needs the globe." : id === "aurora" ? props.aurora.unavailable : null;
  const journey = useJourneyNavigation({
    active,
    linked: props.views.navigation.linkedJourney,
    current: memory.current,
    camera: props.explorer.read,
    map: deck.map,
    aurora: props.aurora.run ?? undefined,
    city: props.views.skyCity.name,
    browseMap: props.explorer.flat,
    float: floatDive.view,
    curtain: active === "dust" && !!deck.view?.curtain,
    foldGlacier: () => deck.depart("glacier"),
    departRadar: props.radar.depart,
    departStorm: () => deck.depart("katrina"),
    unavailable,
    open: (id, trigger, visit, fresh, arrival) =>
      navigate(id, trigger, visit, false, fresh, undefined, arrival),
  });
  checkpointJourney.current = journey.checkpoint;
  useLayoutEffect(() => {
    props.views.navigation.extension.current = {
      capture() {
        const source = origin.current;
        const restoreJourney = journey.capture();
        return () => {
          origin.current = source;
          restoreJourney();
        };
      },
      journey: () => (journey.route ? { id: journey.route.id, step: journey.route.step } : undefined),
    };
  });
  function rememberOrigin(trigger: string) {
    const collection = captureCollection(trigger);
    const fromStory = trigger.startsWith("related-story-") || trigger === "open-find-in-story";
    if (!collection && !fromStory && (active !== null || origin.current)) return;
    const scrollTarget = props.views.observing ? "observatory-intro" : "chrome-rail";
    origin.current = {
      route: props.views.navigation.capture(props.explorer.read()),
      camera: previewOrigin.current?.camera ?? props.explorer.read(),
      scroll: document.getElementById(scrollTarget)?.scrollTop ?? 0,
      scrollTarget,
      flat: previewOrigin.current?.flat ?? props.explorer.flat,
      ...(collection ? { collection } : {}),
      ...(origin.current ? { previous: origin.current } : {}),
      label:
        trigger === auroraHandoff
          ? "Back to the ISS finding"
          : collection
            ? "Back to Saved"
            : fromStory && active
              ? `Back to ${searchStories.find((item) => item.id === active)?.title ?? "previous story"}`
              : (props.views.observing ? props.views.browser.open : props.views.browser.pane === "stories")
                ? "Back to stories"
                : props.views.observing
                  ? "Back to home"
                  : "Back to layers",
      trigger,
    };
  }
  function navigate(
    id: string,
    trigger = "observatory-scenes",
    saved?: Visit,
    keepScene = false,
    fresh = false,
    nightfall?: SkyPosition,
    arrival?: JourneyArrival,
  ) {
    const story = searchStories.find((entry) => entry.id === id);
    if (!story || unavailable(id)) return;
    panelReturn.cancel();
    props.views.checkpoint.current();
    rememberOrigin(trigger);
    setRestoredCollection(null);
    const previewed = previewOrigin.current?.place;
    const destination = storyPlace(id);
    const preview =
      previewed && previewed.lon === destination?.lon && previewed.lat === destination.lat
        ? previewed
        : undefined;
    previewOrigin.current = null;
    setPreviewOpen(false);
    reportCompletion(id, false);
    const standalone = ["sky", "meteors", "moonfall", "aurora", "sun", "radar", "float"].includes(id);
    const resuming = saved !== undefined;
    if (!fresh) saved ??= memory.library.recent.find((visit) => visit.id === id);
    const map = arrival?.map ?? (!resuming && !props.views.observing ? props.explorer.flat : undefined);
    const openReplay = () => {
      const city = saved?.position.moment?.city ?? arrival?.city;
      if ((id === "orbit" || id === "north") && city) props.views.skyCity.restore(city);
      if (id === "north" && arrival?.aurora) props.aurora.restore(arrival.aurora, props.explorer.read());
      deck.open(
        id as StoryId,
        trigger,
        saved?.position.moment ?? (fresh ? null : undefined),
        map === undefined ? arrival : { ...arrival, map, preview },
      );
    };
    props.views.navigation.prepareStory(
      id === "north" && arrival?.aurora
        ? "night"
        : keepScene && props.views.observing
          ? props.scene
          : story.scene,
      !standalone,
      !standalone
        ? openReplay
        : () => {
            deck.setTrigger(trigger);
            if (id === "sky" || id === "meteors" || id === "moonfall") {
              openSkyStory(
                props.views,
                id,
                saved,
                arrival,
                nightfall,
                fresh,
                arrival?.skyDeparture ? tonight.view : null,
              );
            } else if (id === "aurora" || id === "sun") openAuroraStory(props, id, saved, arrival);
            else if (id === "radar") {
              const exploring = !props.views.observing && !resuming;
              props.radar.open(
                exploring ? currentRadarRegion : saved?.position.radar?.region,
                false,
                exploring ? props.explorer.radarAt : saved?.position.radar?.at,
                arrival?.pose ?? (exploring ? props.explorer.read() : saved?.position.radar?.pose),
              );
              deck.setMap(map ?? saved?.position.radar?.map ?? false);
            } else if (id === "float") {
              const exploring = !props.views.observing && !resuming;
              deck.setMap(
                arrival?.map ??
                  (exploring || !saved ? props.explorer.flat : (saved.position.float?.map ?? false)),
              );
              floatDive.open(saved?.position.float, arrival?.float, arrival?.floatState, arrival?.pose);
            }
          },
    );
  }
  function returnToBrowse() {
    const saved = origin.current;
    if (!saved) {
      if (!active || deck.trigger?.startsWith("event-story-") || deck.trigger?.startsWith("archive-story-"))
        return false;
      const category = props.views.browser.category;
      const full = props.views.browser.expanded === (category ?? "all");
      const focus = !full
        ? `continue-story-${active}`
        : featuredStoryId(category) === active
          ? `open-featured-${active}`
          : storyButtonId(active);
      showCatalogue(false, focus);
      return true;
    }
    journey.leave();
    origin.current = saved.previous ?? null;
    props.views.visitCheckpoint.current();
    if (active === "radar" && props.radar.view && isGlobalRadar(props.radar.view.region))
      props.explorer.radarTime(props.radar.view.selectedAt ?? null);
    if (active === "float") floatDive.view?.depart(saved.camera);
    props.views.navigation.restore(saved.route);
    props.explorer.restore(saved.camera, saved.flat);
    if (saved.collection) {
      setRestoredCollection(saved.collection);
      requestAnimationFrame(() => document.getElementById(saved.scrollTarget)?.scrollTo(0, saved.scroll));
      return true;
    }
    panelReturn.restore({
      scrollTarget: saved.scrollTarget,
      scroll: saved.scroll,
      focus: saved.trigger,
      fallback: saved.trigger.startsWith("journey-")
        ? "journey-browse"
        : active
          ? `continue-story-${active}`
          : saved.scrollTarget,
    });
    return true;
  }
  function showCatalogue(focusSearch = false, entry?: string) {
    panelReturn.cancel();
    previewOrigin.current = null;
    setPreviewOpen(false);
    origin.current = null;
    journey.leave();
    const focus = focusSearch ? "story-search-input" : (entry ?? "explorer-stories-tab");
    props.views.navigation.requestExploreFocus(focus);
    if (focusSearch) {
      props.views.browser.scroll.current = 0;
      props.views.browser.select(null);
    }
    props.views.browser.show("stories");
    props.onExplore(true);
    panelReturn.restore({
      scrollTarget: "chrome-rail",
      scroll: props.views.browser.scroll.current,
      focus,
      fallback: "explorer-stories-tab",
    });
  }
  const toured = useRef(false);
  const restoreTour = useRef(returnToBrowse);
  restoreTour.current = returnToBrowse;
  useEffect(() => {
    const running = props.tour.at !== null;
    const ended = toured.current && !running;
    toured.current = running;
    if (ended && active === null) restoreTour.current();
  }, [props.tour.at, active]);
  return (
    <Navigation.Provider
      value={{
        active,
        hasReturnOrigin: origin.current !== null,
        auroraFromPass: origin.current?.trigger === auroraHandoff,
        restoredCollection,
        dismissRestoration: () => setRestoredCollection(null),
        completed: completion?.id === active && completion.complete,
        completion: reportCompletion,
        browsingStories: props.views.observing
          ? props.views.browser.open
          : props.views.browser.pane === "stories",
        previewMap: props.explorer.flat,
        previewOpen,
        previewCity: props.views.skyCity.city,
        moonAboveHorizon: tonight.view ? (tonight.view.bodies[0]?.altitude ?? 0) > 0 : undefined,
        preview(place, restore = true, keepProjection = false) {
          if (place) {
            previewOrigin.current ??= {
              camera: props.explorer.read(),
              flat: props.explorer.flat,
              journey: keepProjection,
            };
            if (!keepProjection) {
              previewOrigin.current.place =
                "label" in place && typeof place.label === "string"
                  ? { ...place, label: place.label }
                  : undefined;
              setPreviewOpen(true);
            }
            refreshAnnotations(place);
          } else if (previewOrigin.current?.journey === keepProjection) {
            const saved = previewOrigin.current;
            previewOrigin.current = null;
            if (!keepProjection) setPreviewOpen(false);
            if (restore)
              props.explorer.restore(saved.camera, keepProjection ? props.explorer.flat : saved.flat);
          }
        },
        returnLabel:
          origin.current?.label ??
          (active && !deck.trigger?.startsWith("event-story-") && !deck.trigger?.startsWith("archive-story-")
            ? "Back to stories"
            : undefined),
        browse: showCatalogue,
        explore() {
          if (active !== null && origin.current?.route.origin.presentation === "explore" && returnToBrowse())
            return;
          panelReturn.cancel();
          previewOrigin.current = null;
          setPreviewOpen(false);
          origin.current = null;
          journey.leave();
          const pane = props.views.browser.pane;
          const focus = pane === "stories" ? "explorer-stories-tab" : "explorer-layers-tab";
          props.views.navigation.requestExploreFocus(focus);
          props.views.browser.show(pane);
          props.onExplore(true);
        },
        openRadar(at, map, trigger = "open-explorer-radar") {
          rememberOrigin(trigger);
          const pose = props.explorer.read();
          journey.leave();
          props.views.navigation.prepareStory("live", false, () => {
            props.radar.open(currentRadarRegion, false, at, pose);
            deck.setMap(map);
          });
        },
        returnToBrowse,
        ...memory,
        resume(visit, trigger = "observatory-scenes", smart = false) {
          journey.leave();
          const action = smart ? visitAction(visit) : "Continue";
          navigate(
            visit.id,
            trigger,
            action === "Continue" ? visit : restartVisit(visit),
            false,
            action !== "Continue",
          );
        },
        ...journey,
        unavailable,
        openNightfall(position, trigger) {
          journey.leave();
          navigate("sky", trigger, undefined, false, true, position);
        },
        openSkyAt(city, trigger) {
          if (unavailable("sky")) return;
          journey.leave();
          props.views.skyCity.select(city);
          navigate("sky", trigger, undefined, false, true);
        },
        open(id, trigger, keepScene) {
          journey.leave();
          navigate(id, trigger, undefined, keepScene);
        },
        tour() {
          journey.leave();
          rememberOrigin("start-story-tour");
          props.tour.start();
        },
      }}
    >
      {children}
    </Navigation.Provider>
  );
}
