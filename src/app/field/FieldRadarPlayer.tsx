import type { ComponentProps } from "react";
import { PlaybackButton } from "../PlaybackButton";
import { shortRadarTime } from "../radar/RadarPlayer";
import { radarScanDate } from "../radar/radarScanStatus";
import { ScanStrip } from "./ScanStrip";

function StepIcon({ next = false }: { next?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d={next ? "m6 3 5 5-5 5" : "m10 3-5 5 5 5"} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export function FieldRadarPlayer({
  scans,
  index,
  images,
  readCamera,
  seek,
  playing,
  displayed,
  atLatest,
  play,
  latest,
}: ComponentProps<typeof ScanStrip> & {
  playing: boolean;
  displayed: boolean;
  atLatest: boolean;
  play: () => void;
  latest: () => void;
}) {
  const scan = scans[index];
  if (!scan) return null;
  return (
    <div className="radar-inline field-player" role="group" aria-label="Radar scan controls">
      <div className="radar-clock">
        <time dateTime={new Date(scan.at).toISOString()} data-radar-displayed={displayed || undefined}>
          <strong>
            {shortRadarTime(scan.at)} <small>UTC</small>
          </strong>
          <span>{radarScanDate(scan.at)}</span>
        </time>
        <div className="field-transport">
          <button
            type="button"
            aria-label="Previous radar scan"
            disabled={index === 0}
            onClick={() => seek(index - 1)}
          >
            <StepIcon />
          </button>
          <PlaybackButton
            playing={playing}
            ended={index === scans.length - 1}
            disabled={scans.length < 2}
            onClick={play}
          />
          <button
            type="button"
            aria-label="Next radar scan"
            disabled={index >= scans.length - 1}
            onClick={() => seek(index + 1)}
          >
            <StepIcon next />
          </button>
        </div>
      </div>
      <ScanStrip
        {...{ scans, index, images, readCamera, seek }}
        latestButton={
          <button className="field-latest" type="button" aria-pressed={atLatest} onClick={latest}>
            Latest
          </button>
        }
      />
    </div>
  );
}
