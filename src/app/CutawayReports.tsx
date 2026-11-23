import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import type { DepthRecord } from "../data/depthRecords";
import { nearbyQuakes, type PlaceContextProps } from "./discovery/PlaceContext";
import { distanceKm } from "../geo/sphere";
import { compactSpan } from "./format";
import "./depth-reading.css";

const radius = 1_500;
const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export function CutawayReports({
  record,
  back,
  allLayers,
  select,
  reading,
  onClose,
  feed,
  filters,
  at,
  now,
  revision,
  feeds,
}: PlaceContextProps & {
  record: DepthRecord;
  back: () => void;
  allLayers: () => void;
  select: (key: string) => void;
  reading: ReactNode;
  onClose: () => void;
}) {
  const quakes = useMemo(() => {
    void revision;
    return nearbyQuakes(feed, filters, at, now, record, radius);
  }, [revision, feed, filters, at, now, record]);
  const sources = feeds.rows.filter(({ id }) => id === "usgs" || id === "emsc");
  const checking = sources.some(({ state }) => state === "pending");
  const unavailable = sources.length > 0 && sources.every(({ state }) => state === "failed");
  const partial = sources.some(({ state }) => state === "failed");
  const selectedRow = useRef<{ key: string; scroll: number; top: number }>();
  const inspecting = !!reading;
  const returnToList = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const rail = document.getElementById("chrome-rail");
    if (inspecting) {
      rail?.scrollTo(0, 0);
      returnToList.current?.focus({ preventScroll: true });
    } else if (selectedRow.current) {
      const { key, scroll, top } = selectedRow.current;
      selectedRow.current = undefined;
      const row = rail?.querySelector<HTMLElement>(`[data-cutaway-report="${CSS.escape(key)}"]`);
      if (rail) rail.scrollTop = row ? rail.scrollTop + row.getBoundingClientRect().top - top : scroll;
      (row ?? document.getElementById("cutaway-nearby-title"))?.focus({ preventScroll: true });
    }
  }, [inspecting]);
  return (
    <section
      className="cutaway-reports"
      aria-label="Nearby earthquake reports"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || document.querySelector(":popover-open")) return;
        event.preventDefault();
        event.stopPropagation();
        if (inspecting) onClose();
        else back();
      }}
    >
      <nav className="cutaway-report-nav" aria-label="Cutaway navigation">
        <button id="back-to-cutaway" className="layer-story-link" type="button" onClick={back}>
          Back to cutaway
        </button>
        <button className="layer-story-link" type="button" onClick={allLayers}>
          All layers
        </button>
        {inspecting && (
          <button ref={returnToList} type="button" className="layer-story-link" onClick={onClose}>
            Back to nearby earthquakes
          </button>
        )}
      </nav>
      <p className="held-cutaway">
        Cutaway held · {date.format(new Date(record.at))} · {record.depthKm} km deep
      </p>
      {inspecting ? (
        reading
      ) : (
        <>
          <div className="layer-inspector-heading">
            <h2 id="cutaway-nearby-title" tabIndex={-1}>
              Nearby earthquakes
            </h2>
            <p>Southwest Pacific · Within {radius.toLocaleString("en")} km of the selected epicentre</p>
          </div>
          <p>
            Available reports · Last {compactSpan(filters.windowMs)} · M{filters.minMagnitude.toFixed(1)}+
          </p>
          {quakes.length ? (
            <ul>
              {quakes.slice(0, 8).map(({ key, primary }) => (
                <li key={key}>
                  <button
                    type="button"
                    data-cutaway-report={key}
                    onClick={(event) => {
                      selectedRow.current = {
                        key,
                        scroll: document.getElementById("chrome-rail")?.scrollTop ?? 0,
                        top: event.currentTarget.getBoundingClientRect().top,
                      };
                      select(key);
                    }}
                  >
                    <strong>{primary.place || "Earthquake"}</strong>
                    <span>
                      M{primary.magnitude.toFixed(1)} · {Math.round(primary.depthKm)} km deep ·{" "}
                      {Math.round(
                        distanceKm(record.lon, record.lat, primary.lon, primary.lat),
                      ).toLocaleString("en")}{" "}
                      km away
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">
              {unavailable
                ? "Earthquake sources are unavailable."
                : checking
                  ? "Checking for nearby earthquakes…"
                  : "No nearby reports match this time and magnitude range."}
            </p>
          )}
          {partial && !unavailable && <p>One earthquake source is unavailable. Coverage is partial.</p>}
        </>
      )}
    </section>
  );
}
