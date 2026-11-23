import type { Cyclone } from "../../sources/cyclones";
import { geographicCoordinates } from "../../globe/orbitReadout";
import { layerTime } from "../layerTime";
import { TimelineTrack } from "../observations/TimelineTrack";
import type { LiveStorm } from "./useLiveStorm";
import "./live-storm.css";

export function LiveStormReading({
  storm,
  point,
  fixes,
  index,
  select,
  loading,
  failed,
  back,
}: LiveStorm & { back: () => void }) {
  const label = point.at === null ? geographicCoordinates(point) : layerTime(point.at);
  return (
    <section className="live-storm" aria-labelledby="live-storm-title">
      <button className="reading-back" type="button" onClick={back}>
        Back to previous view
      </button>

      <p className="live-storm-kicker">Tropical cyclone</p>
      <h2 id="live-storm-title" tabIndex={-1}>
        {storm.name}
      </h2>
      <div className="live-storm-track" role="group" aria-labelledby="live-storm-track-title">
        <div className="live-storm-track-header">
          <h3 id="live-storm-track-title">Reported track</h3>
          <span>
            {index + 1} of {fixes.length}
          </span>
        </div>
        <div className="live-storm-position">
          {point.at !== null ? (
            <time dateTime={new Date(point.at).toISOString()}>{label}</time>
          ) : (
            <span>Report time unavailable</span>
          )}
          <span>{geographicCoordinates(point)}</span>
        </div>
        <dl className="live-storm-reading">
          <div>
            <dt>Wind</dt>
            <dd>{point.windKmh === null ? "Not reported" : `${Math.round(point.windKmh)} km/h`}</dd>
          </div>
          <div>
            <dt>Pressure</dt>
            <dd>{point.pressureHpa === null ? "Not reported" : `${Math.round(point.pressureHpa)} hPa`}</dd>
          </div>
        </dl>
        <div className="live-storm-steps">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => select(index - 1)}
            aria-label="Previous reported position"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <TimelineTrack max={fixes.length - 1} current={index}>
            <input
              className="scrub-slider live-storm-scrub"
              type="range"
              min={0}
              max={fixes.length - 1}
              value={index}
              disabled={fixes.length < 2}
              aria-label="Storm track position"
              aria-valuetext={`Position ${index + 1} of ${fixes.length}, ${label}`}
              onChange={(event) => select(event.currentTarget.valueAsNumber)}
            />
          </TimelineTrack>
          <button
            type="button"
            disabled={index >= fixes.length - 1}
            onClick={() => select(index + 1)}
            aria-label="Next reported position"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
        {loading && <p role="status">Loading advisory readings…</p>}
        {failed && (
          <p role="status">Couldn’t load the latest advisories. Available track positions are still shown.</p>
        )}
      </div>
    </section>
  );
}

export function LiveStormSources({ storm }: { storm: Cyclone }) {
  return (
    <details className="live-storm-sources">
      <summary>Sources &amp; times</summary>
      <p>
        Storm positions are reported in UTC by {storm.source ? `${storm.source} via ` : ""}
        <a href={`https://www.gdacs.org/report.aspx?eventid=${encodeURIComponent(storm.id)}&eventtype=TC`}>
          GDACS
        </a>
        .
      </p>
      <p>
        <a href="https://www.rainviewer.com/">RainViewer</a> radar uses its own scan times. Radar coverage
        varies by location.
      </p>
    </details>
  );
}
