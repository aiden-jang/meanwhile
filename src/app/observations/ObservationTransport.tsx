import { PlaybackButton } from "../PlaybackButton";
import { StoryDock } from "./StoryDock";
import type { ObservationFrame } from "./types";

export function ObservationTransport({
  frame,
  frames,
  index,
  label,
  sliderLabel = label,
  time,
  playing,
  seek,
  toggle,
}: {
  frame: ObservationFrame;
  frames: readonly ObservationFrame[];
  index: number;
  label: string;
  sliderLabel?: string;
  time: string;
  playing: boolean;
  seek: (at: number) => void;
  toggle: () => void;
}) {
  return (
    <StoryDock>
      <div className="observation-transport">
        <span>
          <span className="observation-transport-label">{label} · </span>
          {frame.timeLabel ? time : <time dateTime={new Date(frame.at).toISOString()}>{time}</time>}
        </span>
        {frames.length > 1 && (
          <>
            <input
              className="scrub-slider observation-scrub"
              aria-label={sliderLabel}
              aria-valuetext={time}
              type="range"
              min={0}
              max={frames.length - 1}
              value={index}
              onChange={(event) => seek(frames[event.currentTarget.valueAsNumber]!.at)}
            />
            <div className="observatory-actions">
              <PlaybackButton playing={playing} ended={index === frames.length - 1} onClick={toggle} />
            </div>
          </>
        )}
      </div>
    </StoryDock>
  );
}
