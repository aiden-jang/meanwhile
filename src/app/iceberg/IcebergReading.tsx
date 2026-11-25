import type { ReactNode, RefObject } from "react";
import { latLon } from "../format";
import type { ObservationFrame } from "../observations/types";
import type { useObservationImage } from "../observations/useObservationData";
import { END, dateIso, type Fix } from "./icebergTimeline";

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function IcebergReading({
  frame,
  index,
  fix,
  photo,
  linked,
  readingPanel,
  photoButton,
  image,
  onSeek,
  onPhoto,
  replayOpen,
  onReplay,
  children,
}: {
  frame: ObservationFrame;
  index: number;
  fix: Fix | undefined;
  photo: boolean;
  linked: boolean;
  readingPanel: RefObject<HTMLDivElement>;
  photoButton: RefObject<HTMLButtonElement>;
  image: ReturnType<typeof useObservationImage>;
  onSeek: (day: number) => void;
  onPhoto: () => void;
  replayOpen: boolean;
  onReplay: () => void;
  children: ReactNode;
}) {
  const reading = frame.measurements?.[0];
  const caption = fix ? "Recorded position" : reading?.value;
  return (
    <div className="iceberg-reading" ref={readingPanel} data-evidence-body="">
      <div className="iceberg-fix">
        <h3 tabIndex={-1} data-evidence-point={linked && !photo ? true : undefined}>
          <time dateTime={dateIso(index)}>{longDate.format(frame.at)}</time>
        </h3>
        <p>{photo ? frame.photograph?.alt.split(" · ")[0] : `${reading?.label} · ${caption}`}</p>
        <p className="iceberg-coordinates">
          {photo ? "Scotia Sea · South Georgia" : fix && latLon(fix[1], fix[2])}
        </p>
      </div>
      {!photo && (
        <div className="iceberg-dates">
          <label htmlFor="iceberg-track-date">Track date</label>
          <input
            className="scrub-slider observation-scrub"
            id="iceberg-track-date"
            type="range"
            min={0}
            max={END}
            value={index}
            aria-valuetext={frame.timeLabel}
            onChange={(event) => onSeek(event.currentTarget.valueAsNumber)}
          />
          <div className="iceberg-date-limits" aria-hidden="true">
            <span>{shortDate.format(Date.parse(dateIso(0)))}</span>
            <span>{shortDate.format(Date.parse(dateIso(END)))}</span>
          </div>
        </div>
      )}
      <div className="iceberg-actions observatory-actions">
        <button type="button" ref={photoButton} onClick={onPhoto}>
          {photo ? "Back to track" : frame.photograph ? "Open satellite image" : "Jump to 23 Dec"}
        </button>
        {!photo && (
          <button
            type="button"
            aria-expanded={replayOpen}
            aria-controls="iceberg-playback"
            onClick={onReplay}
          >
            {replayOpen ? "Hide replay" : "Replay controls"}
          </button>
        )}
        {photo && image.status === "failed" && (
          <button type="button" onClick={image.retry}>
            Retry image
          </button>
        )}
      </div>
      <div
        className="iceberg-playback observatory-actions"
        role="group"
        aria-label="Story playback"
        id="iceberg-playback"
        hidden={photo || !replayOpen}
      >
        {children}
      </div>
      {photo && image.status === "loading" && <p role="status">Opening the archived image…</p>}
      {photo && image.status === "failed" && <p role="status">The archived image couldn’t open.</p>}
    </div>
  );
}
