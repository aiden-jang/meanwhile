import { PressureChart } from "./PressureChart";
import { TongaSources } from "./TongaSources";
import { KeepPressure } from "./KeepPressure";
import { ShareMoment } from "../observations/StorySession";
import type { ReplayProps } from "../observations/RecordedReplay";
import { pressureShare } from "./pressureShare";
import { pressureAt, timeIso, timeLabel } from "./tongaTimeline";
import type { TongaStation } from "./useTongaPlayback";

export function TongaExploreReading({
  station,
  minute,
  panel,
  onSeek,
  onKeep,
  onJourney,
}: {
  station: TongaStation;
  minute: number;
  panel: Pick<ReplayProps, "map" | "onClose" | "closeLabel">;
  onSeek: (minute: number) => void;
  onKeep: () => void;
  onJourney: () => void;
}) {
  const value = pressureAt(station, minute);
  const end = station.start + station.values.length - 1;
  return (
    <section className="tonga-explore-reading" aria-label={`${station.name} pressure evidence`}>
      <button type="button" className="reading-back" onClick={panel.onClose}>
        {panel.closeLabel}
      </button>
      <p className="tonga-explore-date">Archive · 15 January 2022</p>
      <h2>Tonga’s shockwave</h2>
      <p className="tonga-explore-intro">An eruption in Tonga, recorded by a barometer in {station.name}.</p>
      <div className="tonga-explore-instrument">
        <div className="tonga-explore-station">
          <strong>{station.name}</strong>
          <time dateTime={timeIso(minute)}>{timeLabel(minute)} UTC</time>
        </div>
        <p className="tonga-explore-value">
          {value === null ? (
            "No reading"
          ) : (
            <>
              {value.toFixed(2)} <span>hPa</span>
            </>
          )}
        </p>
        <PressureChart compact station={station} minute={minute} onSeek={onSeek} />
        <div className="tonga-chart-meta">
          <time dateTime={timeIso(station.start)}>{timeLabel(station.start)} UTC</time>
          <time dateTime={timeIso(end)}>{timeLabel(end)} UTC</time>
        </div>
      </div>
      <p className="tonga-explore-help">Drag the pressure trace to move through time.</p>
      <p className="tonga-explore-help">Modeled wavefront · Measured pressure</p>
      <details className="tonga-explore-more">
        <summary>Full story, sources &amp; reading</summary>
        <button type="button" onClick={onJourney}>
          Follow the full story
        </button>
        <KeepPressure station={station} minute={minute} map={panel.map} onKept={onKeep} />
        <ShareMoment label="Share finding" share={pressureShare} />
        <TongaSources />
      </details>
    </section>
  );
}
