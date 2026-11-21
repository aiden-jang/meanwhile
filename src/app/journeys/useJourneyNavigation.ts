import { useEffect, useRef, useState } from "react";
import { reportAnalytics } from "../../../analytics/browser";
import type { CameraState } from "../../globe/controlsTypes";
import { store, stored } from "../stored";
import type { FloatDiveView } from "../float/floatPlayback";
import type { Visit } from "../visitor/library";
import { journeys } from "./catalogue";
import { connectedArrival, type ConnectedStop, type JourneyArrival } from "./connectedStops";
import { foldDeparture } from "./foldDeparture";
import { journeyProgressKey, packJourneyProgress, readJourneyProgress } from "./journeyProgress";

type JourneyRoute = { id: string; step: number; folding?: "waterline" | "curtain" };

interface JourneyInputs {
  active: string | null;
  current: () => Visit | null;
  camera: () => CameraState;
  map: boolean;
  browseMap: boolean;
  float: FloatDiveView | null;
  curtain: boolean;
  unavailable: (id: string) => string | null;
  open: (id: string, trigger: string, visit?: Visit, fresh?: boolean, arrival?: JourneyArrival) => void;
}

export function useJourneyNavigation(inputs: JourneyInputs) {
  const [route, setRoute] = useState<JourneyRoute | null>(null);
  const [journeyProgress, setProgress] = useState(() => readJourneyProgress(stored(journeyProgressKey)));
  const stops = useRef(new Map<number, ConnectedStop>());
  const folding = useRef<(() => void) | undefined>();
  const activeRoute = journeys.find(({ id }) => id === route?.id);
  const visible = route && activeRoute?.steps[route.step]?.id === inputs.active ? route : null;
  useEffect(() => {
    if (route && inputs.active === null) setRoute(null);
    if (inputs.active !== "float" && inputs.active !== "dust") folding.current = undefined;
  }, [inputs.active, route]);

  function persist(id: string, step: number) {
    if (!stops.current.has(step)) return;
    store(journeyProgressKey, packJourneyProgress(id, step, stops.current));
    setProgress({ id, step, stops: [...stops.current] });
  }

  function capture() {
    const pose = inputs.camera();
    return { pose, map: inputs.map, float: inputs.float?.checkpoint(pose) };
  }

  function checkpoint() {
    if (!visible) return;
    const visit = inputs.current();
    if (visit && !visible.folding) {
      const prior = stops.current.get(visible.step);
      // An untouched loading view can still be showing the prior stop's camera.
      if (Object.keys(visit.position).length || !prior)
        stops.current.set(visible.step, { visit, arrival: capture() });
    }
    persist(visible.id, visible.step);
  }

  function leave() {
    checkpoint();
    folding.current = undefined;
    setRoute(null);
  }

  function enter(id: string, index: number, trigger: string, resume: boolean) {
    const journey = journeys.find((entry) => entry.id === id);
    const next = journey?.steps[index];
    if (!journey || !next || inputs.unavailable(next.id)) return;
    const saved = resume && journeyProgress?.id === id ? journeyProgress : null;
    stops.current = new Map(saved?.stops);
    const stop = stops.current.get(index);
    const map = inputs.browseMap;
    if (!stop)
      stops.current.set(index, { visit: { id: next.id, seen: Date.now(), position: {} }, arrival: { map } });
    inputs.open(
      next.id,
      trigger,
      stop?.visit,
      !!journey.guide || resume,
      stop?.arrival ?? (journey.guide ? { map } : undefined),
    );
    setRoute({ id, step: index });
    persist(id, index);
    if (!resume) reportAnalytics({ name: "journey_started", journey: id });
  }

  return {
    journeyProgress,
    route: visible,
    checkpoint,
    leave,
    start: (id: string, trigger = `journey-${id}`) => enter(id, 0, trigger, false),
    continueJourney(id: string, trigger: string) {
      if (journeyProgress?.id === id) enter(id, journeyProgress.step, trigger, true);
    },
    step(index: number) {
      const next = activeRoute?.steps[index];
      if (!route || route.folding || !next || inputs.unavailable(next.id)) return;
      const revisit = stops.current.has(index);
      const here = capture();
      const stop = connectedArrival(stops.current, route.step, index, next.id, inputs.current(), here);
      const connected = !!activeRoute?.guide || revisit;
      const advance = () => {
        stops.current.set(index, stop);
        inputs.open(
          next.id,
          `journey-${route.id}`,
          connected ? stop.visit : undefined,
          connected,
          connected ? stop.arrival : undefined,
        );
        setRoute({ id: route.id, step: index });
        persist(route.id, index);
      };
      const transition = foldDeparture(inputs.float, inputs.curtain, folding, advance);
      if (transition) setRoute({ ...route, folding: transition });
      else advance();
    },
    finish(complete: boolean) {
      if (complete && route) {
        reportAnalytics({ name: "journey_completed", journey: route.id });
        store(journeyProgressKey, "");
        setProgress(null);
      } else checkpoint();
      folding.current = undefined;
      setRoute(null);
    },
  };
}
