import type { StoryMoment } from "../observations/storyMoment";
import { DURATION, END } from "./tongaTimeline";
import type { TongaPhase } from "./TongaWorld";

const phases: readonly TongaPhase[] = ["discover", "follow", "inspect", "kept", "shared"];

export function readTongaPosition(token: string | null): StoryMoment["tongaView"] {
  const [phase, held, time, pinned, station] = token?.split(",") ?? [];
  const elapsed = Number(time);
  const anchor = pinned ? Number(pinned) : undefined;
  if (
    !phase ||
    !phases.includes(phase as TongaPhase) ||
    (held !== "0" && held !== "1") ||
    !time ||
    !Number.isFinite(elapsed) ||
    elapsed < 0 ||
    elapsed > DURATION ||
    (anchor !== undefined && (!Number.isFinite(anchor) || anchor < 0 || anchor > END)) ||
    (station && !/^[A-Z0-9]{2,6}$/.test(station))
  )
    return;
  return { phase: phase as TongaPhase, held: held === "1", elapsed, anchor, station: station || undefined };
}

export function writeTongaPosition(view: NonNullable<StoryMoment["tongaView"]>) {
  return [view.phase, view.held ? 1 : 0, view.elapsed, view.anchor, view.station].join(",");
}
