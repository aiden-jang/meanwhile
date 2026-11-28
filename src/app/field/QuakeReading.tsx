import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CameraState } from "../../globe/controls";
import type { Quake } from "../../data/types";
import { geographicCoordinates } from "../../globe/orbitReadout";
import { refreshAnnotations } from "../../globe/annotationInput";
import { layerTime } from "../layerTime";
import { place } from "../format";

export interface LayerReport {
  quake: Quake;
  from: "radar" | "earthquakes";
}

const km = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
function DepthSection({ value }: { value: number }) {
  if (!Number.isFinite(value)) return <p>Depth was not reported.</p>;
  if (value < 0) return <p>Reported depth: {km.format(value)} km relative to the source datum.</p>;
  const floor =
    [10, 30, 70, 150, 300, 700].find((stop) => stop >= value * 1.15) ?? Math.ceil((value * 1.15) / 100) * 100;
  const depth = (100 * value) / floor + "%";
  return (
    <figure className="field-depth" aria-label={`Reported depth ${km.format(value)} kilometres`}>
      <figcaption>
        <span>Reported depth</span>
        <strong>
          {km.format(value)} <small>km</small>
        </strong>
      </figcaption>
      <div className="field-section" aria-hidden="true">
        <span>0 km</span>
        <div className="field-depth-column">
          <i style={{ height: depth }} />
        </div>
        <span>{floor} km</span>
      </div>
    </figure>
  );
}

export function QuakeReading({
  report,
  flat,
  visible,
  readCamera,
  back,
}: {
  report: LayerReport;
  flat: boolean;
  visible: boolean;
  readCamera: () => CameraState;
  back: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { primary, readings } = report.quake;
  const world = document.getElementById("globe-view");
  useLayoutEffect(() => {
    if (!visible) return;
    document.getElementById("chrome-rail")?.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
    refreshAnnotations();
  }, [report.quake.key, visible]);
  return (
    <section
      className="field-reading"
      aria-labelledby="field-reading-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !document.querySelector(":popover-open")) {
          event.stopPropagation();
          event.preventDefault();
          back();
        }
      }}
    >
      <header className="field-header">
        <h2 id="field-reading-title" ref={heading} tabIndex={-1}>
          {place(primary.place) || "Earthquake epicentre"}
        </h2>
        <button id="back-from-field-report" className="reading-back" type="button" onClick={back}>
          Back to {report.from === "radar" ? "radar" : "earthquakes"}
        </button>
      </header>
      <div className="field-event-meta">
        <span>
          {primary.scale} {primary.magnitude.toFixed(1)}
        </span>
        <time dateTime={new Date(primary.time).toISOString()}>{layerTime(primary.time)}</time>
      </div>
      <DepthSection value={primary.depthKm} />
      <div className="field-position">
        <span>{geographicCoordinates(primary)}</span>
        <button
          type="button"
          className="field-action"
          onClick={() =>
            refreshAnnotations({
              lon: primary.lon,
              lat: primary.lat,
              zoom: Math.max(readCamera().zoom, flat ? 4.5 : 2.4),
            })
          }
        >
          Locate on {flat ? "map" : "globe"}
        </button>
      </div>
      <div className="field-agencies">
        {readings.map((r) => (
          <div key={r.source}>
            {r.source === "usgs" ? (
              <a
                href={`https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(r.id)}`}
                target="_blank"
                rel="noreferrer"
              >
                USGS record
              </a>
            ) : (
              <a
                href={`https://www.seismicportal.eu/fdsnws/event/1/query?eventid=${encodeURIComponent(r.id)}&format=json`}
                target="_blank"
                rel="noreferrer"
              >
                EMSC record
              </a>
            )}
            <span>
              {r.scale} {r.magnitude.toFixed(1)}
              {Number.isFinite(r.depthKm) && ` · ${km.format(r.depthKm)} km deep`}
            </span>
          </div>
        ))}
      </div>
      {visible &&
        world &&
        createPortal(
          <div className="field-anchors" aria-hidden="true">
            <span
              className="field-epicentre"
              data-observation-anchor=""
              data-priority-anchor=""
              data-compact-anchor=""
              data-world-story-marker=""
              data-lon={primary.lon}
              data-lat={primary.lat}
            >
              <i />
              <b>
                Epicentre{" "}
                <span>
                  {primary.scale} {primary.magnitude.toFixed(1)}
                </span>
              </b>
            </span>
          </div>,
          world,
        )}
    </section>
  );
}
