import { FIXES, FLIGHT_MS, START, SURVEY_MS, TRACK_MINUTES } from "./stormTrack";

export interface Playback {
  elapsed: number;
  survey: boolean;
  playing: boolean;
  phase: "intro" | "follow" | "inspect" | "compare";
}

export function seekTo(minute: number): Playback {
  return { elapsed: (minute / TRACK_MINUTES) * SURVEY_MS, survey: true, playing: false, phase: "inspect" };
}

export const fixedComparison = (minute: number): Playback => ({ ...seekTo(minute), phase: "compare" });

export function initialPlayback(at: number, compare: boolean) {
  const minute = Math.max(0, Math.min(TRACK_MINUTES, (at - START) / 60_000));
  const fix = FIXES.reduce((closest, candidate) =>
    Math.abs(at - candidate.time) < Math.abs(at - closest.time) ? candidate : closest,
  );
  return compare ? fixedComparison((fix.time - START) / 60_000) : seekTo(minute);
}

export const duration = (playback: Playback) => (playback.survey ? SURVEY_MS : FLIGHT_MS);
