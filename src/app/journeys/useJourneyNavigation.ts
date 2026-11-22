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

type JourneyRoute = { id: string; step: number; folding?: "waterline" | "curtain" | "glacier" };

interface JourneyInputs {
  linked?: { id: string; step: number } | undefined;
  active: string | null;
  current: () => Visit | null;
  camera: () => CameraState;
  map: boolean;
  browseMap: boolean;
  float: FloatDiveView | null;
  curtain: boolean;
  foldGlacier: () => boolean;
  unavailable: (id: string) => string | null;
  open: (id: string, trigger: string, visit?: Visit, fresh?: boolean, arrival?: JourneyArrival) => void;
}

export function useJourneyNavigation(inputs: JourneyInputs) {
  const [route, setRoute] = useState<JourneyRoute | null>(() => inputs.linked ?? null);
  const [journeyProgress, setProgress] = useState(() => readJourneyProgress(stored(journeyProgressKey)));
  const [records] = useState(
    () =>
      new Map(
        journeys.flatMap(({ id }) => {
          const saved = readJourneyProgress(stored(`${journeyProgressKey}:${id}`));
          return saved ? [[id, saved] as const] : [];
        }),
      ),
  );
  const [stops] = useState(() => ({
    current: new Map<number, ConnectedStop>(inputs.linked ? progressFor(inputs.linked.id)?.stops : undefined),
  }));
  const folding = useRef<(() => void) | undefined>();
  const activeRoute = journeys.find(({ id }) => id === route?.id);
  const visible = route && activeRoute?.steps[route.step]?.id === inputs.active ? route : null;
  useEffect(() => {
    if (route && inputs.active === null) setRoute(null);
    if (!visible?.folding) folding.current = undefined;
  }, [inputs.active, route, visible?.folding]);

  function progressFor(id: string) {
    return records.get(id) ?? (journeyProgress?.id === id ? journeyProgress : null);
  }

  function persist(id: string, step: number) {
    if (!stops.current.has(step)) return;
    const packed = packJourneyProgress(id, step, stops.current);
    store(journeyProgressKey, packed);
    store(`${journeyProgressKey}:${id}`, packed);
    const progress = { id, step, stops: [...stops.current] };
    records.delete(id);
    records.set(id, progress);
    setProgress(progress);
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
    const saved = resume ? progressFor(id) : null;
    stops.current = new Map(saved?.stops);
    const stop = stops.current.get(index);
    const map = inputs.browseMap;
    if (!stop)
      stops.current.set(index, { visit: { id: next.id, seen: Date.now(), position: {} }, arrival: { map } });
    setRoute({ id, step: index });
    inputs.open(
      next.id,
      trigger,
      stop?.visit,
      !!journey.guide || resume,
      stop?.arrival ?? (journey.guide ? { map } : undefined),
    );
    persist(id, index);
    if (!resume) reportAnalytics({ name: "journey_started", journey: id });
  }

  return {
    journeyProgress,
    progressFor,
    route: visible,
    capture() {
      const saved = new Map(stops.current);
      const position = route ? { id: route.id, step: route.step } : null;
      return () => {
        stops.current = new Map(saved);
        folding.current = undefined;
        setRoute(position);
      };
    },
    checkpoint,
    leave,
    start: (id: string, trigger = `journey-${id}`) => enter(id, 0, trigger, false),
    continueJourney(id: string, trigger: string) {
      const progress = progressFor(id);
      if (progress) enter(id, progress.step, trigger, true);
    },
    step(index: number) {
      const next = activeRoute?.steps[index];
      if (!route || route.folding || index === route.step || !next || inputs.unavailable(next.id)) return;
      const revisit = stops.current.has(index);
      const here = capture();
      const stop = connectedArrival(stops.current, route.step, index, next.id, inputs.current(), here);
      const connected = !!activeRoute?.guide || revisit;
      const crossing = route.id === "ice-in-motion" && next.id === "iceberg";
      if (crossing) stop.arrival.crossing = true;
      const advance = () => {
        folding.current = undefined;
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
      if (
        crossing &&
        inputs.active === "glacier" &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches &&
        inputs.foldGlacier()
      ) {
        const finish = () => {
          if (folding.current === finish) advance();
        };
        folding.current = finish;
        setRoute({ ...route, folding: "glacier" });
        window.setTimeout(finish, 380);
        return;
      }
      const transition = foldDeparture(inputs.float, inputs.curtain, folding, advance);
      if (transition) setRoute({ ...route, folding: transition });
      else advance();
    },
    finish(complete: boolean) {
      if (complete && route) {
        reportAnalytics({ name: "journey_completed", journey: route.id });
        records.delete(route.id);
        store(`${journeyProgressKey}:${route.id}`, "");
        const previous = [...records.values()].sort(
          (a, b) =>
            (b.stops.find(([i]) => i === b.step)?.[1].visit.seen ?? 0) -
            (a.stops.find(([i]) => i === a.step)?.[1].visit.seen ?? 0),
        )[0];
        store(
          journeyProgressKey,
          previous ? packJourneyProgress(previous.id, previous.step, new Map(previous.stops)) : "",
        );
        setProgress(previous ?? null);
      } else checkpoint();
      folding.current = undefined;
      setRoute(null);
    },
  };
}
