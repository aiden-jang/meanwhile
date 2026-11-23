import { useLayoutEffect, useRef } from "react";
import { depthRecords, type DepthRecord } from "../data/depthRecords";
import { SLAB_FROM, SLAB_TO } from "../geo/slab";
import { StoryProjection } from "./observations/StoryProjection";
import { useObservatoryEscape } from "./useObservatoryEscape";
import "./depth-reading.css";

const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function DepthReading({
  record,
  select,
  onHome,
  projection,
}: {
  record: DepthRecord;
  select: (record: DepthRecord) => void;
  onHome: () => void;
  projection: { map: boolean; setMap: (map: boolean) => void };
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => title.current?.focus({ preventScroll: true }), []);
  useObservatoryEscape(onHome);

  return (
    <section className="replay-region depth-reading" aria-label="Earthquake cutaway">
      <div className="observatory-stage replay-stage" data-stage="depth">
        <div className="stage-ident">
          <span className="stage-rule" aria-hidden="true" />
          Fiji and Tonga
        </div>
        <StoryProjection map={projection.map} onMap={projection.setMap} label="Cutaway projection" />
      </div>
      <div className="observatory-sidebar replay-sidebar">
        <div className="observatory-intro observation-panel" id="observatory-intro" tabIndex={-1}>
          <div className="observation-heading">
            <h2 ref={title} tabIndex={-1}>
              Below the Surface
            </h2>
            <div className="observatory-actions">
              <button type="button" onClick={onHome} aria-label="Back to the Observatory">
                <span className="observation-back-full">Back to the Observatory</span>
                <span className="observation-back-compact">Back</span>
              </button>
            </div>
          </div>
          <p className="observation-note">
            {projection.map
              ? "The dot marks the selected earthquake’s epicentre. Its reported depth is below."
              : "Look into the cutaway. Guide rings mark 300, 600 and 900 km below the surface at true scale."}
          </p>
          <div className="depth-reading-value" aria-live="polite" aria-atomic="true">
            <strong>
              {record.depthKm} <small>km deep</small>
            </strong>
            <span>
              {record.title} · {record.scale} {record.magnitude}
            </span>
            <time dateTime={record.at}>{day.format(new Date(record.at))} · USGS archive</time>
          </div>
          <div className="depth-reading-options" role="group" aria-label="Recorded earthquakes">
            {depthRecords.map((event) => (
              <button
                key={event.id}
                type="button"
                aria-pressed={event.id === record.id}
                onClick={() => select(event)}
              >
                <span>{day.format(new Date(event.at))}</span>
                <strong>{event.depthKm} km</strong>
              </button>
            ))}
          </div>
          <p className="observation-note">
            Faint points in Globe show a separate {SLAB_FROM}–{SLAB_TO} USGS catalogue sample.
          </p>
          <a
            className="depth-reading-source"
            href={`https://earthquake.usgs.gov/earthquakes/eventpage/${record.id}`}
            target="_blank"
            rel="noreferrer"
          >
            USGS event record
          </a>
        </div>
      </div>
    </section>
  );
}
