import { useEffect, useLayoutEffect, useRef } from "react";
import type { ObservatoryProps } from "../Observatory";
import type { Visit, VisitPosition } from "./library";
import { skyPosition } from "../tonight/skyMoment";
import { recordDeparture } from "./departingVisits";
import { useVisitLibrary } from "./useVisitLibrary";
import { currentRadarRegion } from "../radar/radarCamera";

// Capture before navigation disposes the player. See ARCHITECTURE.md#srcappvisitorusevisitmemoryts.
export function useVisitMemory(
  props: ObservatoryProps,
  active: string | null,
  completed: boolean,
  onCheckpoint?: () => void,
) {
  const library = useVisitLibrary();
  const latest = useRef<() => Visit | null>(() => null);
  const latestCheckpoint = useRef(onCheckpoint);
  latestCheckpoint.current = onCheckpoint;
  const opened = useRef({ id: active, at: Date.now() });
  if (opened.current.id !== active) opened.current = { id: active, at: Date.now() };
  const read = () => {
    if (!active) return null;
    const position: VisitPosition = {};
    const { observations, tonight, floatDive, sun } = props.views;
    const moment = props.views.getMoment();
    if (moment?.id === active) position.moment = moment;
    if (active === "sun" && moment?.journey?.id === "follow-aurora") {
      const { sample, xray } = sun.selection();
      if (sample) position.solar = sample;
      if (xray) position.solarXray = xray;
    }
    const sky = tonight.view;
    if (sky) position.sky = skyPosition(sky, observations.map, tonight.orbit);
    const float = floatDive.view;
    if (float)
      position.float = {
        profile: `${float.source}/${float.profile.id}`,
        index: float.read().index,
        ...(observations.map ? { map: true } : {}),
      };
    if (props.radar.view)
      position.radar = {
        map: observations.map,
        ...(props.radar.view.region ? { region: props.radar.view.region } : {}),
        ...(props.radar.view.selectedAt !== undefined ? { at: props.radar.view.selectedAt } : {}),
        ...(props.radar.view.region === currentRadarRegion ? { pose: props.explorer.read() } : {}),
      };
    return { id: active, seen: opened.current.at, position, ...(completed ? { completed: true } : {}) };
  };
  latest.current = read;
  const visit = library.visit;
  const checkpoint = props.views.visitCheckpoint;
  useLayoutEffect(() => {
    const save = () => {
      const value = latest.current();
      if (value) visit(value);
      latestCheckpoint.current?.();
    };
    checkpoint.current = save;
    const hidden = () => {
      if (document.hidden) save();
    };
    const departing = () => {
      const value = latest.current();
      if (value) recordDeparture(value);
      latestCheckpoint.current?.();
    };
    window.addEventListener("pagehide", departing);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      checkpoint.current = () => {};
      window.removeEventListener("pagehide", departing);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [checkpoint, visit]);
  useEffect(() => {
    const value = latest.current();
    if (value) visit(value);
  }, [active, visit]);
  return { library, current: read };
}
