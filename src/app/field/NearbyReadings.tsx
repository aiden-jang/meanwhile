import { useMemo } from "react";
import type { Quake } from "../../data/types";
import { distanceKm } from "../../geo/sphere";
import { type PlaceContextProps, nearbyQuakes } from "../discovery/PlaceContext";
import { compactSpan, place } from "../format";
import { useReadingArea } from "./useReadingArea";
import type { CameraState } from "../../globe/controls";
import { layerHealth } from "../layerMetadata";

const reportDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function NearbyReadings({
  reports,
  readCamera,
  inspecting,
  select,
  follow,
  enabled,
  enable,
}: {
  reports: PlaceContextProps;
  readCamera: () => CameraState;
  inspecting: boolean;
  select: (quake: Quake) => void;
  follow?: (() => void) | undefined;
  enabled: boolean;
  enable: () => void;
}) {
  const {
    area: { lon, lat },
    hold,
  } = useReadingArea(readCamera, inspecting);
  const { feed, revision, filters, at, now, feeds } = reports;
  const quakes = useMemo(() => {
    void revision;
    return nearbyQuakes(feed, filters, at, now, { lon, lat })
      .filter(({ primary }) => primary.kind.toLowerCase() === "earthquake")
      .map((quake) => ({ quake, distance: distanceKm(lon, lat, quake.primary.lon, quake.primary.lat) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [feed, filters, at, now, lon, lat, revision]);
  const health = layerHealth(
    "earthquakes",
    feeds.rows.filter((row) => filters.sources.has(row.id as "emsc" | "usgs")),
  );
  return (
    <>
      <section className="field-nearby" aria-labelledby="field-nearby-title">
        <h3 id="field-nearby-title">Nearby earthquakes</h3>
        <p>
          Within 500 km of view center · Past{" "}
          {compactSpan(filters.windowMs)
            .replace(/^(\d+)d$/, "$1 days")
            .replace(/^(\d+)h$/, "$1 hours")}
        </p>
        {!enabled ? (
          <button className="field-action" type="button" onClick={enable}>
            Show earthquakes
          </button>
        ) : quakes.length ? (
          <ul>
            {quakes.map(({ quake, distance }) => {
              const { primary } = quake;
              const km = Math.round(distance);
              return (
                <li key={quake.key}>
                  <button
                    type="button"
                    id={`nearby-${quake.key}`}
                    onClick={(event) => {
                      event.currentTarget.focus({ preventScroll: true });
                      hold();
                      select(quake);
                    }}
                  >
                    <span className="field-mag">
                      {primary.magnitude.toFixed(1)}
                      <small>{primary.scale}</small>
                    </span>
                    <span className="field-place">
                      {place(primary.place) || "Unnamed epicentre"}
                      <small>
                        {km} km away · {reportDate.format(primary.time)} · {primary.source.toUpperCase()}
                      </small>
                    </span>
                    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
                      <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="field-empty" role="status">
            {!filters.sources.size
              ? "Choose an earthquake source to see reports."
              : health || "No matching reports here. Move the globe or map to search another area."}
          </p>
        )}
        {enabled && quakes.length > 0 && health && <p className="field-source-state">{health}</p>}
      </section>
      {follow && (
        <button type="button" id="open-explorer-radar" className="layer-story-link" onClick={follow}>
          Follow a radar region <span>Guided view · same available scans</span>
        </button>
      )}
    </>
  );
}
