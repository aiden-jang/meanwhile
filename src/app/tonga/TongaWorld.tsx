import { ReadingLabel } from "../observations/ReadingLabel";
import { ORIGIN, pressureAt, stations, timeIso, timeLabel } from "./tongaTimeline";
import { PressureChart } from "./PressureChart";
import type { TongaStation } from "./useTongaPlayback";

export type TongaPhase = "discover" | "follow" | "inspect" | "kept" | "shared";

export function TongaWorld({
  phase,
  station,
  signal,
  reading,
  minute,
  onInspect,
  returnHome,
}: {
  phase: TongaPhase;
  station: TongaStation;
  signal: TongaStation | undefined;
  reading: boolean;
  minute: number;
  onInspect: (minute: number, station: TongaStation, trigger: HTMLButtonElement) => void;
  returnHome?: (() => void) | undefined;
}) {
  const ordered = [station, ...stations.filter(({ id }) => id !== station.id)];
  const inspecting = phase === "inspect" || phase === "shared";
  return (
    <>
      <div className="tonga-world-anchors" aria-label="Recorded pressure stations">
        <span
          className="tonga-origin-label"
          data-observation-anchor=""
          data-lon={ORIGIN.lon}
          data-lat={ORIGIN.lat}
        >
          Tonga
        </span>
        {ordered.map((item) => (
          <button
            key={item.id}
            type="button"
            data-observation-anchor=""
            data-lon={item.lon}
            data-lat={item.lat}
            data-evidence-source={
              signal?.id === item.id || (inspecting && item.id === station.id) ? "true" : undefined
            }
            data-station-signal={signal?.id === item.id ? "" : undefined}
            data-station-reading={reading && item.id === station.id ? "" : undefined}
            aria-current={reading && item.id === station.id ? "true" : undefined}
            data-compact-anchor=""
            data-projection-anchor={station.id === item.id || undefined}
            onClick={(event) =>
              onInspect(
                pressureAt(item, minute) === null ? item.peak : Math.floor(minute),
                item,
                event.currentTarget,
              )
            }
            aria-label={`Inspect ${item.name} pressure`}
          >
            <span className="tonga-station-point" aria-hidden="true" />
            {!(inspecting && item.id === station.id) && (
              <span>
                {item.name}
                <small>{item.id} · station pressure</small>
              </span>
            )}
          </button>
        ))}
      </div>
      {signal && (
        <div
          className="tonga-signal"
          data-evidence-body=""
          role="group"
          aria-label={`${signal.name} recorded pressure pulse`}
        >
          <div className="tonga-signal-name">
            <strong>{signal.name}</strong>
            <time dateTime={timeIso(signal.peak)}>{timeLabel(signal.peak)} UTC</time>
          </div>
          <PressureChart station={signal} minute={signal.peak} compact linked />
        </div>
      )}
      {(phase === "inspect" || phase === "shared" || phase === "kept") && (
        <div className="tonga-world-title" aria-hidden="true">
          {phase === "inspect" ? (
            <>
              A pulse,
              <br />
              recorded.
            </>
          ) : phase === "kept" ? (
            <>
              A moment
              <br />
              worth keeping.
            </>
          ) : (
            <>
              A pulse,
              <br />
              across the Pacific.
            </>
          )}
        </div>
      )}
      {inspecting && (
        <ReadingLabel reading={`${station.id}:${Math.floor(minute)}`}>{station.name}</ReadingLabel>
      )}
      {returnHome && (inspecting || phase === "kept") && (
        <button
          type="button"
          className="reading-back tonga-reading-home"
          aria-label="Back to home"
          onClick={returnHome}
        >
          Back
        </button>
      )}
    </>
  );
}
