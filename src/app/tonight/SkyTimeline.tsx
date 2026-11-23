import { TimelineTrack } from "../observations/TimelineTrack";
import type { localNight } from "../../geo/tonight";
import type { skyTimeFormats } from "./SkyEarthReading";

const minute = 60_000;

export function SkyTimeline({
  id,
  at,
  night,
  format,
  kept,
  onSeek,
  compact,
}: {
  id: string;
  at: number;
  night: ReturnType<typeof localNight>;
  format: ReturnType<typeof skyTimeFormats>;
  kept?: readonly number[] | undefined;
  onSeek: (at: number) => void;
  compact?: boolean;
}) {
  const max = Math.floor((night.end - night.start) / minute);
  return (
    <div className={compact ? "entry-scrub tonight-time" : "tonight-time"}>
      <div className="tonight-clock">
        <label htmlFor={id}>{compact ? "Scrub the night" : "City local time"}</label>
        <time dateTime={new Date(at).toISOString()}>{format.local.format(at)}</time>
      </div>
      <TimelineTrack max={max} current={(at - night.start) / minute} kept={kept}>
        <input
          id={id}
          type="range"
          className="scrub-slider tonight-scrub"
          min={0}
          max={max}
          value={(at - night.start) / minute}
          aria-label="City local time"
          aria-valuetext={format.local.format(at)}
          onChange={(event) => onSeek(night.start + event.currentTarget.valueAsNumber * minute)}
        />
      </TimelineTrack>
      <div className="tonight-clock tonight-edges">
        <span>
          {night.sunset ? "Sunset" : "Evening"} · {format.clock.format(night.start)}
        </span>
        <span>
          {night.sunrise ? "Sunrise" : "Morning"} · {format.clock.format(night.end)}
        </span>
      </div>
    </div>
  );
}
