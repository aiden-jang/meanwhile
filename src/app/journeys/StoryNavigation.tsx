import type { BrowseOrigin, StoryNavigationValue } from "./storyNavigationTypes";
import { usePanelReturn } from "../usePanelReturn";
import { visitAction, restartVisit } from "../visitor/visitAction";
import { useStoryPreviewControls } from "../discovery/useStoryPreviewControls";
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
import { activeStory } from "../continuity/activeStory";
import { worldContinuation } from "../continuity/worldContinuation";
import { pacificId } from "../pacific/pacificMoment";
import { captureCollection } from "../visitor/collectionReturn";
import { storyPlace } from "../discovery/places";
import { featuredStoryId, storyButtonId } from "../storyBrowse";
import type { StoryId } from "../observations/useObservationDeck";
import { currentRadarRegion, isGlobalRadar } from "../radar/radarCamera";
import { useVisitMemory } from "../visitor/useVisitMemory";
import type { Visit } from "../visitor/library";
import type { SkyPosition } from "../tonight/skyMoment";
import type { CollectionPosition } from "../visitor/collectionReturn";
import { useFindReturn } from "../visitor/findPosition";
import { openSkyStory } from "./openSkyStory";
import type { JourneyArrival } from "./connectedStops";
import { useJourneyNavigation } from "./useJourneyNavigation";
import { auroraHandoff } from "./auroraJourney";
import { openAuroraStory } from "./openAuroraStory";
import { storyReturnLabel, captureBrowseOrigin, openStoryCatalogue } from "./storyBrowseOrigin";
import { isKatrinaHandoff, weatherOrigin } from "../storm/weatherHandoff";
import { passageRecord } from "../tonga/honolulu";
import { isWorldStoryMarker } from "../discovery/worldStoryMarker";

const Navigation = createContext<StoryNavigationValue | null>(null);

export const useStoryNavigation = () => useContext(Navigation);

export function StoryNavigation({ children, ...props }: ObservatoryProps & { children: ReactNode }) {
  const panelReturn = usePanelReturn();
  const [restoredCollection, setRestoredCollection] = useState<CollectionPosition | null>(null);
  const find = useFindReturn();
  const [completion, setCompletion] = useState<{ id: string; complete: boolean } | null>(null);
  const reportCompletion = useCallback((id: string, complete: boolean) => {
    setCompletion((previous) =>
      previous?.id === id && previous.complete === complete ? previous : { id, complete },
    );
  }, []);
  const {
    origin: previewOrigin,
    open: previewOpen,
    preview,
    clear: closePreview,
  } = useStoryPreviewControls(props.explorer);
  const origin = useRef<BrowseOrigin | null>(null);
  const { observations: deck, tonight, floatDive } = props.views;
  const active = activeStory(props);
  const openingPacific = useRef<CollectionPosition>();
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
        const search = find.departure.current ?? find.position;
        const collection = openingPacific.current;
        const restoreJourney = journey.capture();
        return () => {
          origin.current = source;
          restoreJourney();
          find.restore(search);
          if (collection) setRestoredCollection(collection);
        };
      },
      journey: () => (journey.route ? { id: journey.route.id, step: journey.route.step } : undefined),
    };
  });
  function rememberOrigin(trigger: string) {
    origin.current = captureBrowseOrigin(props, trigger, active, origin.current, previewOrigin.current);
    const search = find.departure.current;
    if (search && origin.current) origin.current = { ...origin.current, find: search, label: "Back to Find" };
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
    if (id === pacificId) {
      openingPacific.current = captureCollection(trigger) ?? undefined;
      props.pacific.open(document.getElementById(trigger), saved?.position.moment);
      openingPacific.current = undefined;
      return;
    }
    panelReturn.cancel();
    props.views.checkpoint.current();
    rememberOrigin(trigger);
    setRestoredCollection(null);
    const previewed = previewOrigin.current?.place;
    const destination = storyPlace(id);
    const previewedPlace =
      previewed && previewed.lon === destination?.lon && previewed.lat === destination.lat
        ? previewed
        : undefined;
    closePreview();
    reportCompletion(id, false);
    const standalone = ["sky", "meteors", "moonfall", "aurora", "sun", "radar", "float"].includes(id);
    if (id === "katrina" && isKatrinaHandoff(trigger)) {
      fresh = true;
      arrival = { map: props.explorer.flat, crossing: true };
    }
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
        map === undefined ? arrival : { ...arrival, map, preview: previewedPlace },
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
      leaveStory();
      openStoryCatalogue(props, panelReturn.restore, false, focus);
      return true;
    }
    if (active === "float") floatDive.view?.depart(saved.camera);
    if (
      deck.trigger === passageRecord ||
      isWorldStoryMarker(saved.trigger) ||
      saved.trigger.startsWith("context-story-") ||
      weatherOrigin(saved.trigger)
    ) {
      props.views.visitCheckpoint.current();
      history.back();
      return true;
    }
    journey.leave();
    origin.current = saved.previous ?? null;
    props.views.visitCheckpoint.current();
    if (active === "radar" && props.radar.view && isGlobalRadar(props.radar.view.region))
      props.explorer.radarTime(props.radar.view.selectedAt ?? null);
    props.views.navigation.restore(saved.route);
    props.explorer.restore(saved.camera, saved.flat);
    if (saved.collection || saved.find) {
      panelReturn.restore({ scrollTarget: saved.scrollTarget, scroll: saved.scroll, focus: "" });
      if (saved.collection) setRestoredCollection(saved.collection);
      else find.restore(saved.find ?? null);
      return true;
    }
    panelReturn.restore({
      scrollTarget: saved.scrollTarget,
      scroll: saved.scroll,
      rowOffset: saved.rowOffset,
      focus: saved.trigger,
      fallback: saved.trigger.startsWith("journey-")
        ? "journeys-toggle"
        : active
          ? `continue-story-${active}`
          : saved.scrollTarget,
    });
    return true;
  }
  function leaveStory() {
    panelReturn.cancel();
    closePreview();
    origin.current = null;
    journey.leave();
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
        returnView: origin.current,
        hasReturnOrigin: origin.current !== null,
        auroraFromPass: origin.current?.trigger === auroraHandoff,
        katrinaFromWeather: isKatrinaHandoff(deck.trigger),
        restoredCollection,
        restoredFind: find.position,
        launchFromFind: find.launch,
        dismissFind: () => find.restore(null),
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
        preview,
        returnLabel: storyReturnLabel(origin.current, active, deck.trigger),
        browse(focusSearch) {
          leaveStory();
          openStoryCatalogue(props, panelReturn.restore, !!focusSearch);
        },
        explore(opener) {
          const subject = props.explorePaths.hasPreviousView()
            ? undefined
            : worldContinuation(props, active, memory.current);
          if (subject) props.explorePaths.continueAt(subject, opener);
          else {
            props.explorePaths.resume();
            leaveStory();
          }
        },
        worldContinuation: () => worldContinuation(props, active, memory.current),
        continueAt: props.explorePaths.continueAt,
        openEntrance(id) {
          const trigger = "open-observatory-find";
          journey.leave();
          if (id === "live") {
            props.explorePaths.resume();
            leaveStory();
          } else if (id === "night") {
            navigate("sky", trigger, undefined, false, true);
          } else {
            rememberOrigin(trigger);
            props.views.navigation.prepareStory("depth", false, () => {
              props.onScene("depth", true);
              deck.setTrigger("observatory-entry-depth");
            });
          }
        },
        findTarget(target) {
          props.explorePaths.find(target);
          leaveStory();
        },
        findReturn: props.explorePaths.findReturn,
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
          const related = trigger?.startsWith("related-story-");
          const sky = related && tonight.view && (id === "moonfall" || id === "meteors" || id === "sky");
          navigate(
            id,
            trigger,
            undefined,
            keepScene,
            false,
            undefined,
            related
              ? { map: deck.map, ...(sky && id === "moonfall" ? { skyDeparture: true } : {}) }
              : undefined,
          );
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
