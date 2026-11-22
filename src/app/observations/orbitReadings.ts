import type { ObservationData } from "./types";

const passClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
export const passTime = (at: number) => `${passClock.format(at)} UTC`;

export function orbitTime(zone: string, seconds = true) {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
    timeZoneName: "short",
  });
  return (at: number) => format.format(at);
}

export function nearestOrbitFrame(data: ObservationData, at: number) {
  return data.frames.reduce(
    (best, frame, i) => (Math.abs(frame.at - at) < Math.abs(data.frames[best]!.at - at) ? i : best),
    0,
  );
}
