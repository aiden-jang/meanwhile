import { BIN, DURATION, FINAL_STEP, trace } from "./flashTimeline";

type Detection = (typeof trace)[number];

type FlashWindow = {
  start: number;
  end: number;
  count: number;
  first: Detection | undefined;
  north: Detection | undefined;
  east: Detection | undefined;
};

export const flashWindows = Array.from({ length: FINAL_STEP }, (_, index): FlashWindow => ({
  start: index * BIN,
  end: Math.min((index + 1) * BIN, DURATION),
  count: 0,
  first: undefined,
  north: undefined,
  east: undefined,
}));

for (const detection of trace) {
  const bin = flashWindows[Math.min(FINAL_STEP - 1, Math.floor(detection[0] / BIN))]!;
  bin.count++;
  bin.first ??= detection;
  if (!bin.north || detection[2] > bin.north[2]) bin.north = detection;
  if (!bin.east || detection[1] > bin.east[1]) bin.east = detection;
}

export const flashAnchors = [
  { step: 0, place: "Eastern Texas", title: "First detections", detection: flashWindows[0]!.first! },
  { step: 13, place: "Across the Plains", title: "Eastward spread", detection: flashWindows[13]!.east! },
  { step: 26, place: "Near Kansas City", title: "Northern reach", detection: flashWindows[26]!.north! },
] as const;

export const windowAtStep = (step: number) => flashWindows[Math.max(0, Math.min(step, FINAL_STEP - 1))]!;
export const seconds = (offset: number) => (offset / 1000).toFixed(2);
export const markedDetection = (step: number) =>
  flashAnchors.find((anchor) => anchor.step === step)?.detection ?? windowAtStep(step).north;
