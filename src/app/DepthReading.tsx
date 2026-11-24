import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { depthRecords, type DepthRecord } from "../data/depthRecords";
import { CUTAWAY_DEPTH_KM, CUTAWAY_GUIDES_KM } from "../globe/cutawayScale";
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
  sweepKm = record.depthKm,
  onSweep,
  tabs,
  select,
  onHome,
  onNearby,
  projection,
}: {
  record: DepthRecord;
  sweepKm?: number | undefined;
  onSweep: (depth: number) => void;
  tabs?: ReactNode;
  select: (record: DepthRecord) => void;
  onHome: () => void;
  onNearby: () => void;
  projection: { map: boolean; setMap: (map: boolean) => void };
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const depth = useId();
  const reading = useRef<HTMLDetailsElement>(null);
  const reached = !tabs || sweepKm >= record.depthKm;
  useLayoutEffect(() => title.current?.focus({ preventScroll: true }), []);
  useObservatoryEscape(onHome);

  return (
    <section
      className="replay-region depth-reading"
      data-entry-scene={tabs ? "depth" : undefined}
      aria-label="Earthquake cutaway"
    >
      <div className="observatory-stage replay-stage" data-stage="depth">
        <div className="stage-ident">
          <span className="stage-rule" aria-hidden="true" />
          Fiji and Tonga
        </div>
        {tabs &&
          depthRecords
            .filter((event) => (projection.map ? event.id === record.id : sweepKm >= event.depthKm))
            .map((event) => (
              <button
                key={event.id}
                className="cutaway-reading-anchor"
                type="button"
                aria-label={`Read ${event.title} · ${event.depthKm} km`}
                data-observation-anchor=""
                data-compact-anchor=""
                data-evidence-source={event.id === record.id ? "true" : undefined}
                aria-pressed={event.id === record.id}
                data-lon={event.lon}
                data-lat={event.lat}
                data-depth-km={projection.map ? undefined : event.depthKm}
                onClick={() => {
                  select(event);
                  if (reading.current) reading.current.open = true;
                  reading.current?.querySelector("summary")?.focus({ preventScroll: true });
                }}
              >
                {event.id === record.id && <span aria-hidden="true">{event.depthKm} km</span>}
              </button>
            ))}
        <StoryProjection map={projection.map} onMap={projection.setMap} label="Cutaway projection" />
      </div>
      <div className="observatory-sidebar replay-sidebar">
        <div className="observatory-intro observation-panel" id="observatory-intro" tabIndex={-1}>
          <div className="observation-heading">
            <h2 ref={title} tabIndex={-1}>
              Below the Surface
            </h2>
            <div className="observatory-actions">
              <button
                className="reading-back"
                type="button"
                onClick={onHome}
                aria-label="Back to the Observatory"
              >
                <span className="observation-back-full">Back to the Observatory</span>
                <span className="observation-back-compact">Back</span>
              </button>
            </div>
          </div>
          {tabs && (
            <div className="entry-scrub">
              <div className="entry-scrub-label">
                <label htmlFor={depth}>Drag to change depth</label>
                <output htmlFor={depth}>{sweepKm} km</output>
              </div>
              <input
                className="scrub-slider"
                type="range"
                id={depth}
                min={0}
                max={CUTAWAY_DEPTH_KM}
                value={Math.round(sweepKm)}
                aria-valuetext={`${sweepKm} km`}
                onChange={(event) => onSweep(event.currentTarget.valueAsNumber)}
              />
              <div
                className="cutaway-guide-scale"
                role="group"
                aria-label={projection.map ? "Recorded depths" : "Depth guide rings"}
              >
                {CUTAWAY_GUIDES_KM.map((km) => (
                  <button type="button" key={km} onClick={() => onSweep(km)} aria-pressed={sweepKm === km}>
                    {km ? `${km} km` : "Surface"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="depth-reading-value" aria-live="polite" aria-atomic="true">
            {!reached ? (
              <span>Move past {record.depthKm} km to reach the first recorded quake.</span>
            ) : (
              <>
                <strong>
                  {record.depthKm} <small>km deep</small>
                </strong>
                <span>
                  {record.title} · {record.scale} {record.magnitude}
                </span>
              </>
            )}
          </div>
          {tabs}
          <details className="scene-entry-details" open={!tabs} ref={reading}>
            <summary>Quake readings &amp; sources</summary>
            <p className="observation-note">
              {projection.map
                ? "The marker shows the selected epicentre. The measured depth is below it."
                : "Guide rings are 300, 600 and 900 km below the surface at true scale."}
            </p>
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
          </details>
          <div className="depth-reading-next">
            <button
              id="explore-nearby-earthquakes"
              className="observatory-primary"
              type="button"
              onClick={onNearby}
            >
              Explore nearby earthquakes
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
