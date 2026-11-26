import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStorySession } from "../observations/StorySession";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { captureReplayFrame, restoreReplayFrame } from "../observations/replayReturn";
import type { ReplayProps } from "../observations/RecordedReplay";
import { StationTrace, WavePair, WaveTimeline } from "./WaveReadings";
import {
  amplitudeAt,
  archiveDuration,
  arrivalWindow,
  origin,
  reached,
  waves,
  type StationSlot,
} from "./waveRecordings";

const target = { lon: 177, lat: 35, zoom: 0.94 };
const sonificationSpeed = 900;

export interface WaveReading {
  first: number;
  second: number;
  seconds: number;
  full?: boolean;
}

export interface WavePin {
  id: string;
  name: string;
  lon: number;
  lat: number;
  reached: boolean;
  slot?: StationSlot;
  action: string;
  activate: (opener: HTMLButtonElement) => void;
}

function stationIndex(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isInteger(value) && value >= 0 && value < waves.length
    ? value
    : fallback;
}

export function RecordedWaves({
  back,
  backLabel,
  initialReading,
  onReading,
  onPins,
  trace,
  setTrace,
  ...camera
}: Pick<ReplayProps, "onView" | "map" | "onMap" | "readCamera" | "restoreCamera"> & {
  back: () => void;
  backLabel: string;
  initialReading?: WaveReading | undefined;
  onReading: (reading: WaveReading) => void;
  onPins: (pins: WavePin[]) => void;
  trace: number | null;
  setTrace: (index: number | null) => void;
}): JSX.Element {
  const { onView } = camera;
  const { initial, remember } = useStorySession();
  const navigation = useStoryNavigation();
  const selection = initial?.choice?.split(",").map(Number);
  const [first, setFirst] = useState(initialReading?.first ?? stationIndex(selection?.[0], 0));
  const [second, setSecond] = useState(() => {
    const picked = initialReading?.second ?? stationIndex(selection?.[1], 3);
    return picked === first ? (first + 1) % waves.length : picked;
  });
  const [seconds, setSeconds] = useState(
    initialReading?.seconds ??
      (initial?.chapter === "waves"
        ? Math.max(0, Math.min(archiveDuration, ((initial.at ?? origin) - origin) / 1000))
        : 0),
  );
  const [full, setFull] = useState(initialReading?.full ?? seconds > arrivalWindow);
  const [playing, play] = useState(false);
  const [picking, setPicking] = useState<StationSlot | null>(null);
  const cursor = useRef<HTMLInputElement>(null);
  const sound = useRef<HTMLAudioElement>(null);
  const heldFrame = useRef<{ frame: ReturnType<typeof captureReplayFrame>; station: string }>();
  const cameraAccess = useRef(camera);
  useLayoutEffect(() => {
    cameraAccess.current = camera;
  }, [camera]);
  const a = waves[first]!;
  const b = waves[second]!;
  const span = full ? archiveDuration : arrivalWindow;
  const running = playing && seconds < span;
  const at = origin + seconds * 1000;
  const choice = `${first},${second}`;
  const kept = navigation?.library.saved.some(
    ({ position }) =>
      position.moment?.id === "rupture" &&
      position.moment.chapter === "waves" &&
      position.moment.at === at &&
      position.moment.choice === choice,
  );

  const openTrace = useCallback(
    (index: number, opener?: HTMLButtonElement) => {
      if (trace !== null) return;
      const frame = captureReplayFrame(cameraAccess.current);
      heldFrame.current = { frame: { ...frame, focus: opener ?? null }, station: waves[index]!.id };
      play(false);
      sound.current?.pause();
      setTrace(index);
    },
    [setTrace, trace],
  );

  useLayoutEffect(() => {
    if (trace !== null) {
      document.getElementById("observatory-intro")?.scrollTo(0, 0);
    } else if (heldFrame.current) {
      const { frame, station } = heldFrame.current;
      restoreReplayFrame(
        frame,
        cameraAccess.current,
        () =>
          document.querySelector<HTMLButtonElement>(`[data-recording-row="${station}"]`) ?? cursor.current,
      );
      heldFrame.current = undefined;
    }
  }, [trace]);

  const choose = useCallback(
    (slot: StationSlot, index: number) => {
      if (slot === "first") {
        if (index === second) setSecond(first);
        setFirst(index);
      } else {
        if (index === first) setFirst(second);
        setSecond(index);
      }
      setPicking(null);
      play(false);
      sound.current?.pause();
    },
    [first, second],
  );
  const activate = useCallback(
    (index: number, opener?: HTMLButtonElement) => {
      if (trace !== null) return;
      if (picking) choose(picking, index);
      else if (index === first || index === second) openTrace(index, opener);
      else choose("second", index);
    },
    [choose, first, openTrace, picking, second, trace],
  );
  const arrivals = waves.reduce(
    (mask, station, index) => (reached(station, seconds) ? mask | (1 << index) : mask),
    0,
  );
  const pins = useMemo(
    () =>
      [first, second, ...waves.map((_, i) => i).filter((i) => i !== first && i !== second)].map(
        (index): WavePin => {
          const { id, name, lon, lat } = waves[index]!;
          const slot = index === first ? "first" : index === second ? "second" : undefined;
          return {
            id,
            name,
            lon,
            lat,
            reached: !!(arrivals & (1 << index)),
            ...(slot ? { slot } : {}),
            action: picking
              ? `Pick ${name} as ${picking} station`
              : slot
                ? `Open ${name} trace`
                : `Compare with ${name}`,
            activate: (opener) => activate(index, opener),
          };
        },
      ),
    [first, second, arrivals, activate, picking],
  );
  useLayoutEffect(() => onPins(pins), [pins, onPins]);

  useLayoutEffect(() => {
    onView({
      kind: "observation",
      cameraKey: "waves",
      image: null,
      target,
      ...(trace === null ? { pickMarks: { points: waves, select: activate } } : {}),
      frame: {
        at,
        marks: [
          { lon: 142.373, lat: 38.297, size: 16, color: 0xe8edf5 },
          ...waves.map((station) => {
            const color = station === a ? 0xf2be95 : station === b ? 0xa6dce9 : 0xaebcc9;
            const selected = station === a || station === b;
            const arrived = reached(station, seconds);
            return {
              lon: station.lon,
              lat: station.lat,
              size: arrived ? (selected ? 12 : 8) + Math.sqrt(amplitudeAt(station, seconds) / 1000) * 11 : 7,
              color: arrived ? color : 0x657786,
            };
          }),
        ],
      },
    });
    onReading({ first, second, seconds, full });
  }, [a, b, at, activate, first, full, onReading, onView, second, seconds, trace]);
  useLayoutEffect(() => remember?.({ chapter: "waves", choice }), [choice, remember]);

  useEffect(() => cursor.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    const pauseHidden = () => {
      if (document.hidden) sound.current?.pause();
    };
    document.addEventListener("visibilitychange", pauseHidden);
    return () => document.removeEventListener("visibilitychange", pauseHidden);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setSeconds((time) => Math.min(span, time + (full ? 18 : 6)));
    }, 50);
    return () => window.clearInterval(timer);
  }, [full, running, span]);

  function seek(time: number) {
    play(false);
    setSeconds(time);
  }
  function changeSpan() {
    seek(full ? Math.min(seconds, arrivalWindow) : seconds);
    setFull(!full);
  }

  const reading = trace === null ? null : waves[trace]!;
  return (
    <div className="recorded-controls">
      {reading ? (
        <StationTrace station={reading} seconds={seconds} span={span} second={trace === second} />
      ) : (
        <>
          <WaveTimeline
            seconds={seconds}
            span={span}
            first={a}
            second={b}
            playing={running}
            cursor={cursor}
            seek={seek}
            toggle={() => {
              if (seconds >= span) setSeconds(0);
              play(!running);
            }}
            changeSpan={changeSpan}
          />
          <WavePair
            first={first}
            second={second}
            seconds={seconds}
            picking={picking}
            inspect={openTrace}
            pick={(slot) => setPicking(picking === slot ? null : slot)}
            choose={choose}
          />
          <div className="archive-scene-controls">
            {a.first !== null && (
              <button type="button" className="archive-scene-button" onClick={() => seek(a.first!)}>
                Jump to {a.id} onset
              </button>
            )}
            {b.first !== null && (
              <button type="button" className="archive-scene-button" onClick={() => seek(b.first!)}>
                Jump to {b.id} onset
              </button>
            )}
            {navigation && (
              <button
                type="button"
                className="recorded-primary"
                disabled={kept}
                onClick={() => {
                  const visit = navigation.current();
                  if (visit) navigation.library.save(visit);
                }}
              >
                {kept ? "Comparison kept" : "Keep this comparison"}
              </button>
            )}
            <button type="button" className="archive-scene-button" onClick={back}>
              {backLabel}
            </button>
          </div>
          {navigation?.library.notice && (
            <p role="status" className="observation-note">
              {navigation.library.notice}
            </p>
          )}
        </>
      )}
      <details
        className="recorded-audio"
        key={(reading ?? a).id}
        onToggle={(event) => {
          if (!event.currentTarget.open) sound.current?.pause();
        }}
      >
        <summary onClick={() => play(false)}>
          Listen to {(reading ?? a).id} · {sonificationSpeed}× speed
        </summary>
        <audio
          ref={sound}
          controls
          preload="none"
          onPlay={() => play(false)}
          aria-label={`Sonification of ${(reading ?? a).name} at ${sonificationSpeed} times speed`}
          src={(reading ?? a).audio}
        />
        <p>Recorded motion sped up into audible sound.</p>
      </details>
    </div>
  );
}
