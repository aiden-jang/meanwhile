import { useId, type Ref } from "react";
import { PlaybackButton } from "../PlaybackButton";
import { flashWindows, seconds, windowAtStep } from "./flashReadings";
import { FINAL_STEP, flashTime, timeAtStep } from "./flashTimeline";

const highestCount = Math.max(...flashWindows.map(({ count }) => count));

export function FlashTransport({
  progress,
  hidden,
  first,
  full,
  playing,
  before,
  onSeek,
  onFirst,
  onFull,
  onScan,
  onToggle,
  buttonRef,
  onRead,
}: {
  progress: number;
  hidden: boolean;
  first: boolean;
  full: boolean;
  playing: boolean;
  before: boolean;
  onSeek: (step: number) => void;
  onFirst: () => void;
  onFull: () => void;
  onScan: () => void;
  onToggle: () => void;
  buttonRef: Ref<HTMLButtonElement>;
  onRead: (opener: HTMLButtonElement) => void;
}) {
  const id = useId();
  return (
    <section className="flash-instrument" aria-label="Megaflash timeline" hidden={hidden}>
      <h3>Seven seconds. Five states.</h3>
      <dl className="flash-stats">
        <div>
          <dt>Window start</dt>
          <dd>
            {before ? (
              "—"
            ) : (
              <>
                {seconds(windowAtStep(progress).start)} <small>s</small>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Certified span</dt>
          <dd>
            829 <small>± 8 km</small>
          </dd>
        </div>
      </dl>
      <div className="flash-chart">
        <div className="flash-chart-label">
          <label htmlFor={id}>Scrub the flash</label>
          <span>Trace samples per 0.25 s</span>
        </div>
        <svg className="flash-chart-bars" viewBox="0 0 300 44" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 43H300M0 22H300" />
          {flashWindows.map(({ count, start }, index) => {
            const height = (count / highestCount) * 40;
            return (
              <rect
                key={start}
                x={index * 10 + 0.7}
                y={43 - height}
                width={8.1}
                height={height}
                rx={1.2}
                data-selected={(!before && !full && progress === index) || undefined}
              />
            );
          })}
        </svg>
        <input
          id={id}
          className="scrub-slider"
          type="range"
          min={-1}
          max={FINAL_STEP}
          value={progress}
          aria-valuetext={first ? "First 0.25 s" : flashTime(timeAtStep(progress))}
          onChange={(event) => onSeek(event.currentTarget.valueAsNumber)}
        />
        <div className="flash-chart-key">
          <span>0 s</span>
          <span>7.39 s</span>
        </div>
      </div>
      <div className="flash-actions">
        <button className="flash-open" type="button" onClick={(event) => onRead(event.currentTarget)}>
          Inspect this window
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 12l8-8M5 4h7v7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button type="button" aria-pressed={before} onClick={onScan}>
          Infrared scan
        </button>
      </div>
      <p className="flash-guide">Tap a marked pulse on the scene to jump to its time.</p>
      <div className="flash-replay-actions" role="group" aria-label="Compare optical detections">
        <PlaybackButton
          buttonRef={buttonRef}
          playing={playing}
          ended={full}
          startLabel={before ? "Follow the flash" : undefined}
          onClick={onToggle}
        />
        <button type="button" aria-pressed={first} onClick={onFirst}>
          First detections
        </button>
        <button type="button" aria-pressed={full} onClick={onFull}>
          Full flash
        </button>
      </div>
    </section>
  );
}
