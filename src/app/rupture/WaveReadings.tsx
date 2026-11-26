import { useEffect, useId, useRef, type CSSProperties, type Ref } from "react";
import { PlaybackButton } from "../PlaybackButton";
import { WaveStationPicker } from "./WaveStationPicker";
import {
  arrivalWindow,
  origin,
  reached,
  timeAt,
  traceWidth,
  waves,
  waveTime,
  type Station,
  type StationSlot,
} from "./waveRecordings";

function TimeTicks({ span }: { span: number }) {
  return (
    <div className="recorded-ticks" aria-hidden="true">
      <span>0:00</span>
      {[1, 2, 3].map((step) => (
        <span key={step}>{(span * step) / 180} min</span>
      ))}
    </div>
  );
}

export function WaveTimeline({
  seconds,
  span,
  first,
  second,
  playing,
  cursor,
  seek,
  toggle,
  changeSpan,
}: {
  seconds: number;
  span: number;
  first: Station;
  second: Station;
  playing: boolean;
  cursor: Ref<HTMLInputElement>;
  seek: (time: number) => void;
  toggle: () => void;
  changeSpan: () => void;
}) {
  return (
    <section className="recorded-timeline" aria-label="Recording playback">
      <div className="recorded-clock">
        <div>
          <h3>Recorded arrivals</h3>
          <time dateTime={new Date(origin + seconds * 1000).toISOString()}>{timeAt(seconds)}</time>
        </div>
        <button type="button" className="recorded-span" onClick={changeSpan}>
          {span === arrivalWindow ? "Full 90-minute recording" : "First 15 minutes"}
        </button>
      </div>
      <div className="recorded-transport">
        <PlaybackButton
          className="recorded-play"
          playing={playing}
          ended={seconds >= span}
          aria-label={playing ? "Pause recording" : seconds >= span ? "Replay recording" : "Play recording"}
          startLabel="Play recording"
          onClick={toggle}
        />
        <div className="recorded-axis">
          <input
            ref={cursor}
            className="scrub-slider"
            type="range"
            min="0"
            max={span}
            step="1"
            value={seconds}
            aria-label="Recording time"
            aria-valuetext={timeAt(seconds)}
            style={{ "--recorded-progress": `${(seconds / span) * 100}%` } as CSSProperties}
            onChange={(event) => seek(event.currentTarget.valueAsNumber)}
          />
          {[first, second].map((station, slot) =>
            station.first === null ? null : (
              <i
                key={station.id}
                aria-hidden="true"
                data-second={slot === 1 || undefined}
                data-reached={reached(station, seconds) || undefined}
                style={{ left: `${(station.first / span) * 100}%` }}
              />
            ),
          )}
          <TimeTicks span={span} />
        </div>
      </div>
    </section>
  );
}

export function WavePair({
  first,
  second,
  seconds,
  picking,
  inspect,
  pick,
  choose,
}: {
  first: number;
  second: number;
  seconds: number;
  picking: StationSlot | null;
  inspect: (index: number, opener: HTMLButtonElement) => void;
  pick: (slot: StationSlot) => void;
  choose: (slot: StationSlot, index: number) => void;
}) {
  const statusId = useId();
  const a = waves[first]!;
  const b = waves[second]!;
  const difference = a.first === null || b.first === null ? null : Math.abs(a.first - b.first);
  return (
    <>
      <div className="recorded-pair">
        {[first, second].map((index, slot) => {
          const station = waves[index]!;
          const arrived = reached(station, seconds);
          return (
            <button
              className="recorded-station"
              type="button"
              key={slot}
              data-recording-row={station.id}
              data-second={slot === 1 || undefined}
              data-reached={arrived || undefined}
              aria-label={`Open ${station.shortName} trace`}
              aria-describedby={`${statusId}-${slot}`}
              onClick={(event) => inspect(index, event.currentTarget)}
            >
              <span className="recorded-code">{station.id}</span>
              <strong>{station.shortName}</strong>
              <span className="recorded-onset-status" id={`${statusId}-${slot}`}>
                {station.first === null ? "Onset unclear" : `+${waveTime(station.first)}`}
                {station.first !== null && <small>{arrived ? "Recorded" : "Waiting"}</small>}
              </span>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          );
        })}
        {difference !== null && (
          <div className="wave-onset-interval">
            <strong>
              About {Math.floor(difference / 60)} min {difference % 60} sec
            </strong>
            <span>between recorded onsets</span>
          </div>
        )}
      </div>
      <div className="recorded-pickers" role="group" aria-label="Choose stations">
        {(["first", "second"] as const).map((slot) => (
          <div key={slot}>
            <WaveStationPicker
              stations={waves}
              label={slot === "first" ? "First station" : "Second station"}
              index={slot === "first" ? first : second}
              other={slot === "first" ? second : first}
              select={(index) => choose(slot, index)}
            />
            <button
              className="recorded-pick"
              type="button"
              aria-pressed={picking === slot}
              onClick={() => pick(slot)}
            >
              Pick {slot} on scene
            </button>
          </div>
        ))}
      </div>
      <p className="recorded-hint" role="status">
        {picking ? `Tap a pin for the ${picking} station.` : "Tap a pin on the globe or map."}
      </p>
    </>
  );
}

export function StationTrace({
  station,
  seconds,
  span,
  second,
}: {
  station: Station;
  seconds: number;
  span: number;
  second: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  const x = (time: number) => (time * traceWidth) / span;
  return (
    <section className="recorded-trace" aria-label="Station trace" data-second={second || undefined}>
      <div className="recorded-trace-title">
        <h3 ref={heading} tabIndex={-1}>
          {station.shortName}
        </h3>
        <span className="recorded-code">{station.id}</span>
      </div>
      <p>{station.name.slice(station.shortName.length + 2)}</p>
      <div className="recorded-trace-meta">
        <span>Estimated onset</span>
        <strong>
          {station.first === null ? "Unclear" : `+${waveTime(station.first)} · ${timeAt(station.first)}`}
        </strong>
      </div>
      <svg
        viewBox={`0 0 ${traceWidth} 100`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${station.name}, normalized vertical motion`}
      >
        <path className="recorded-base" d="M0 26H570M0 50H570M0 74H570M190 0V100M380 0V100" />
        <path d={span === arrivalWindow ? station.arrivalTrace : station.archiveTrace} />
        {station.first !== null && <path className="recorded-onset" d={`M${x(station.first)} 0V100`} />}
        <path className="recorded-cursor" d={`M${x(seconds)} 0V100`} />
      </svg>
      <TimeTicks span={span} />
      <p>Vertical ground motion · scaled to this window</p>
    </section>
  );
}
