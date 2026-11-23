import type { KeyboardEventHandler, ReactNode } from "react";
import type { RadarScan } from "../../sources/radar";
import { PlaybackButton } from "../PlaybackButton";
import { RadarTransport } from "./RadarTransport";
import { radarScanDate } from "./radarScanStatus";

export const shortRadarTime = (at: number) => new Date(at).toISOString().slice(11, 16);

export function RadarPlayer({
  layer,
  dock,
  scans,
  index,
  displayed,
  atLatest,
  showLatest,
  playing,
  togglePlay,
  seek,
  children,
}: {
  layer: boolean;
  dock: KeyboardEventHandler<HTMLElement> | undefined;
  scans: readonly RadarScan[];
  index: number;
  displayed: boolean;
  atLatest: boolean;
  showLatest: boolean;
  playing: boolean;
  togglePlay: () => void;
  seek: (scan: RadarScan | null) => void;
  children: ReactNode;
}) {
  const selected = scans[index];
  const latest = scans.at(-1);
  return (
    <RadarTransport layer={layer} dock={dock}>
      <div className="radar-clock">
        <div className="radar-scan-reading">
          {selected && (
            <time
              dateTime={new Date(selected.at).toISOString()}
              data-radar-displayed={displayed || undefined}
            >
              <strong>{shortRadarTime(selected.at)} UTC</strong>
              <span className="radar-reading-date">{radarScanDate(selected.at)}</span>
            </time>
          )}
          {scans[0] && latest && (
            <span className="radar-window">
              <span className="sr-only">Available scans </span>
              {shortRadarTime(scans[0].at)}–{shortRadarTime(latest.at)} UTC
            </span>
          )}
        </div>
        {showLatest && (
          <button
            type="button"
            className="radar-latest"
            title="Jump to the latest scan"
            aria-pressed={atLatest}
            disabled={!selected}
            onClick={() => seek(null)}
          >
            Latest
          </button>
        )}
      </div>
      {children}
      <div className="observatory-actions radar-actions radar-playback">
        <button
          type="button"
          aria-label="Previous radar scan"
          disabled={index === 0 || scans.length < 2}
          onClick={() => seek(scans[index - 1] ?? null)}
        >
          Previous
        </button>
        <PlaybackButton
          playing={playing}
          ended={index === scans.length - 1}
          disabled={scans.length < 2}
          onClick={togglePlay}
        />
        <button
          type="button"
          aria-label="Next radar scan"
          disabled={index >= scans.length - 1 || scans.length < 2}
          onClick={() => seek(scans[index + 1] ?? null)}
        >
          Next
        </button>
      </div>
    </RadarTransport>
  );
}
