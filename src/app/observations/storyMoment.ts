import { isSkyStory, readSkyMoment, writeSkyMoment, type SkyPosition } from "../tonight/skyMoment";
import { observations } from "./catalogue";
import { replays } from "./replays";
import { earthStories } from "../earth-stories/catalogue";
import { readFloatMoment } from "../float/floatMoment";
import { journeys } from "../journeys/catalogue";
import type { SkyLook } from "../../geo/tonight";
import { readTongaPosition, writeTongaPosition } from "../tonga/tongaPosition";
import type { TongaPhase } from "../tonga/TongaWorld";

export interface StoryMoment {
  id: string;
  journey?: { id: string; step: number };
  at?: number;
  choice?: string;
  city?: string;
  chapter?: string;
  map: boolean;
  sky?: SkyPosition;
  aim?: SkyLook | undefined;
  tongaView?: {
    phase: TongaPhase;
    held: boolean;
    elapsed: number;
    anchor?: number | undefined;
    station?: string | undefined;
  };
}

const ids = new Set([
  ...Object.keys(observations),
  ...Object.keys(replays),
  ...Object.keys(earthStories),
  "lights",
  "shadow",
  "kilauea",
  "float",
  "sky",
  "moonfall",
  "meteors",
  "aurora",
  "sun",
  "radar",
]);
const safe = (value: string | null) =>
  value && /^[\p{L}\p{N} .,:_+/-]{1,80}$/u.test(value) ? value : undefined;

export function readStoryMoment(params: URLSearchParams): StoryMoment | undefined {
  const id = params.get("story");
  if (!id || !ids.has(id)) return;
  const result: StoryMoment = { id, map: params.get("p") === "map" };
  const journey = journeys.find((entry) => entry.id === params.get("journey"));
  const stop = params.get("stop");
  const step = Number(stop);
  if (stop !== null && /^[0-9]+$/.test(stop) && journey?.steps[step]?.id === id)
    result.journey = { id: journey.id, step };
  const time = params.get("t");
  const at = Number(time);
  if (time?.trim() && Number.isFinite(at) && at >= -2_208_988_800_000 && at <= 4_102_444_800_000)
    result.at = at;
  const choice = safe(params.get("choice"));
  const chapter = safe(params.get("chapter"));
  const city = safe(params.get("city"));
  if (city) result.city = city;
  if (choice) result.choice = choice;
  if (chapter) result.chapter = chapter;
  const aim = params.get("aim")?.split(",").map(Number);
  if (aim?.length === 2 && aim[0]! >= 0 && aim[0]! < 360 && aim[1]! >= -90 && aim[1]! <= 90)
    result.aim = { azimuth: aim[0]!, altitude: aim[1]! };
  const sky = isSkyStory(id) ? readSkyMoment(params, result) : undefined;
  if (sky) result.sky = sky;
  const tongaView = id === "tonga" ? readTongaPosition(params.get("pulse")) : undefined;
  if (tongaView) result.tongaView = tongaView;
  if (id === "float" && (params.has("choice") || params.has("chapter")) && !readFloatMoment(result)) return;
  return result;
}

export function writeStoryMoment(params: URLSearchParams, moment: StoryMoment) {
  params.set("story", moment.id);
  params.set("p", moment.map ? "map" : "globe");
  params.set("v", "observe");
  if (moment.sky && isSkyStory(moment.id)) writeSkyMoment(params, moment.sky);
  for (const [key, value] of [
    ["t", moment.at],
    ["choice", moment.choice],
    ["pulse", moment.tongaView ? writeTongaPosition(moment.tongaView) : undefined],
    ["city", moment.city],
    ["chapter", moment.chapter],
    ["journey", moment.journey?.id],
    ["stop", moment.journey?.step],
    ["aim", moment.aim ? `${moment.aim.azimuth},${moment.aim.altitude}` : undefined],
  ] as const) {
    if (value !== undefined) params.set(key, String(value));
    else params.delete(key);
  }
}
