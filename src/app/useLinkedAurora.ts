import { useEffect, useRef, useState } from "react";
import type { StoryMoment } from "./observations/storyMoment";
import type { AuroraRun } from "../sources/auroraRoute";

export function useLinkedAurora(story?: StoryMoment) {
  const [request, set] = useState(() => (story?.id === "aurora" ? story : null));
  return { request, set };
}

export function useRestoreAurora(
  request: StoryMoment | null,
  restored: AuroraRun | null,
  forecastAt: number | undefined,
  start: (hemisphere?: 1 | -1, held?: boolean) => void,
) {
  useEffect(() => {
    if (!request || restored || forecastAt === undefined) return;
    start(request.choice === "south" ? -1 : request.choice === "north" ? 1 : undefined, true);
  }, [request, restored, forecastAt, start]);
}

export function auroraMoment(
  run: AuroraRun | null,
  request: StoryMoment | null,
  map: boolean,
): StoryMoment | undefined {
  return run
    ? {
        id: "aurora",
        map,
        at: run.forecast.forecastAt,
        choice: run.route.hemisphere === 1 ? "north" : "south",
      }
    : (request ?? undefined);
}

export function appendJourney(moment: StoryMoment | undefined, journey: StoryMoment["journey"]) {
  return moment && journey ? { ...moment, journey } : moment;
}

export function useRouteExtension() {
  return useRef({
    capture: (): (() => void) | undefined => undefined,
    journey: (): StoryMoment["journey"] => undefined,
  });
}
