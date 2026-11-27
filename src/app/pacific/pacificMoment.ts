import type { StoryMoment } from "../observations/storyMoment";

export const pacificId = "pacific";
export const pacificTitle = "Through the Pacific";
export const alohaStation = { lon: -158, lat: 22.75, name: "Station ALOHA" };
export const castAt = Date.UTC(2024, 11, 19);
export const underwaterStart = 482;

export interface PacificPosition {
  position: number;
  profile: boolean;
}

export function readPacificPosition(moment?: StoryMoment): PacificPosition {
  const value = moment?.choice;
  const position = value && /^\d{1,4}$/.test(value) ? Math.min(1000, Number(value)) : 0;
  return { position, profile: position >= underwaterStart && moment?.chapter === "profile" };
}

export function pacificMoment({ position, profile }: PacificPosition, map: boolean): StoryMoment {
  return {
    id: pacificId,
    map,
    at: castAt,
    choice: String(position),
    chapter: profile ? "profile" : "descent",
  };
}
