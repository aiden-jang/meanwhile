import type { StoryMoment } from "../observations/storyMoment";
import archive from "./tonga.json";

export const honolulu = archive.stations.find(({ id }) => id === "PHNL")!;
export const honoluluTrigger = "inspect-honolulu-from-explore";

export const eruptionMarker = "tonga-passage-marker";
export const landingTonga = "open-landing-tonga";
export const passageRecord = "tonga-passage-record";
export function passageEntrance(trigger: string | null) {
  return trigger === eruptionMarker || trigger === landingTonga;
}

export function honoluluReading(map: boolean): StoryMoment {
  return {
    id: "tonga",
    choice: honolulu.id,
    chapter: "pressure",
    at: Date.parse(`${archive.date}T00:00:00Z`) + honolulu.peak * 60_000,
    map,
  };
}
