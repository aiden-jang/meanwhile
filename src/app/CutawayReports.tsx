import { useMemo } from "react";
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
  select,
  feed,
  filters,
  at,
  now,
  revision,
  feeds,
}: PlaceContextProps & {
  record: DepthRecord;
  back: () => void;
  select: (key: string) => void;
}) {
  const quakes = useMemo(() => {
    void revision;
    return nearbyQuakes(feed, filters, at, now, record, radius);
  }, [revision, feed, filters, at, now, record]);
  const sources = feeds.rows.filter(({ id }) => id === "usgs" || id === "emsc");
  const checking = sources.some(({ state }) => state === "pending");
  const unavailable = sources.length > 0 && sources.every(({ state }) => state === "failed");
  const partial = sources.some(({ state }) => state === "failed");
  return (
    <section className="map-layers cutaway-reports" aria-label="Nearby earthquake reports">
      <button id="back-to-cutaway" className="layer-story-link" type="button" onClick={back}>
        Back to cutaway
      </button>
      <h2 id="cutaway-nearby-title" tabIndex={-1}>
        Nearby earthquakes
      </h2>
      <p>Southwest Pacific · Within {radius.toLocaleString("en")} km of the selected epicentre</p>
      <p>
        Available reports · Last {compactSpan(filters.windowMs)} · M{filters.minMagnitude.toFixed(1)}+
      </p>
      {quakes.length ? (
        <ul>
          {quakes.slice(0, 8).map(({ key, primary }) => (
            <li key={key}>
              <button type="button" onClick={() => select(key)}>
                <strong>{primary.place || "Earthquake"}</strong>
                <span>
                  M{primary.magnitude.toFixed(1)} · {Math.round(primary.depthKm)} km deep ·{" "}
                  {Math.round(distanceKm(record.lon, record.lat, primary.lon, primary.lat)).toLocaleString(
                    "en",
                  )}{" "}
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
      <p className="held-cutaway">
        Cutaway held · {date.format(new Date(record.at))} · {record.depthKm} km deep
      </p>
    </section>
  );
}
