import { useMemo, useState } from "react";
import type { Feed } from "../feed";
import type { Filters, Quake } from "../../data/types";
import type { HazardGroup } from "../hazards";
import type { FeedStatus } from "../feedStatus";
import { skyCities } from "../tonight/cities";
import { matches } from "../../data/filter";
import { distanceKm } from "../../geo/sphere";
import { layerTime } from "../layerTime";
import { refreshAnnotations } from "../../globe/annotationInput";
import { DeviceLocation } from "../location/DeviceLocation";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { geographicCoordinates } from "../../globe/orbitReadout";
import type { ExplorePoint } from "./usePlaceInspection";

type Coordinates = { lon: number; lat: number };

export interface PlaceContextProps {
  ready: boolean;
  feed: Feed;
  filters: Filters;
  at: number;
  now: number;
  revision: number;
  hazards: readonly HazardGroup[];
  feeds: FeedStatus;
}
export function nearbyQuakes(
  feed: Pick<Feed, "store">,
  filters: Filters,
  at: number,
  now: number,
  place: { lon: number; lat: number },
  radius = 500,
) {
  const found: Quake[] = [];
  feed.store.forEach((quake) => {
    const p = quake.primary;
    if (
      p.time <= at &&
      matches(quake, filters, now) &&
      distanceKm(place.lon, place.lat, p.lon, p.lat) <= radius
    )
      found.push(quake);
  });
  return found.sort((a, b) => b.primary.time - a.primary.time);
}
export function PlaceContext(props: PlaceContextProps) {
  return (
    <div className="place-context place-search">
      <PlaceReadings {...props} />
    </div>
  );
}

function PlaceReadings(props: PlaceContextProps) {
  const [name, setName] = useState("");
  const place = skyCities.find((city) => city.name.toLowerCase() === name.trim().toLowerCase());
  return (
    <>
      <label className="explorer-search">
        <span className="sr-only">Choose a featured city</span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m15 15 6 6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <input
          type="search"
          name="place"
          autoComplete="off"
          placeholder="Choose a featured city…"
          list="explorer-places"
          value={name}
          onInput={(event) => setName(event.currentTarget.value)}
        />
        <datalist id="explorer-places">
          {skyCities.map((city) => (
            <option key={city.name} value={city.name} />
          ))}
        </datalist>
      </label>
      <DeviceLocation ready={props.ready} />
      {name && !place && (
        <p>Choose one of the featured cities, or use device location to move to your area.</p>
      )}
      {place && (
        <section aria-label={`Observations around ${place.name}`}>
          <button type="button" className="place-locate" onClick={() => refreshAnnotations(place)}>
            Locate {place.name}
          </button>
          <NearbyReports {...props} point={place} />
        </section>
      )}
    </>
  );
}

export function PlaceInspection({
  point,
  close,
  backLabel,
  selectQuake,
  selectHazard,
  radarAt,
  hasContext = false,
  onRewind,
  ...props
}: PlaceContextProps & {
  point: ExplorePoint;
  close: () => void;
  backLabel?: string | undefined;
  selectQuake: (id: string) => void;
  selectHazard: (id: string) => void;
  radarAt?: number | undefined;
  onRewind?: (() => void) | undefined;
  hasContext?: boolean;
}) {
  const coordinates = geographicCoordinates(point);
  const navigation = useStoryNavigation();
  const city = skyCities.find(({ lon, lat }) => distanceKm(point.lon, point.lat, lon, lat) <= 35);
  return (
    <section className="place-context place-inspection" aria-labelledby="place-title">
      <header>
        <div>
          <h2 id="place-title" tabIndex={-1}>
            {point.name ? (hasContext ? point.name : `Around ${point.name}`) : "Around this point"}
          </h2>
          <p role="status" className="place-coordinates">
            {coordinates}
          </p>
        </div>
        {!hasContext && (
          <button type="button" onClick={close} aria-label={backLabel ?? "Close place readings"}>
            {backLabel ?? "Close"}
          </button>
        )}
      </header>
      <NearbyReports
        {...props}
        point={point}
        selectQuake={selectQuake}
        selectHazard={selectHazard}
        compact={hasContext}
      />
      {city && navigation && (
        <button
          type="button"
          id="place-open-sky"
          className="place-sky-link"
          onClick={() => navigation.openSkyAt(city.name, "place-open-sky")}
          disabled={!!navigation.unavailable("sky")}
        >
          View the sky in {city.name}
        </button>
      )}
      {onRewind && (
        <button type="button" id="rewind-place-radar" className="place-sky-link" onClick={onRewind}>
          Rewind radar
        </button>
      )}
      {radarAt !== undefined && (
        <p className="place-radar-time">
          RainViewer radar · <time dateTime={new Date(radarAt).toISOString()}>{layerTime(radarAt)}</time>
          <small>Coverage varies by location.</small>
        </p>
      )}
    </section>
  );
}

function NearbyReports({
  feed,
  filters,
  at,
  now,
  revision,
  hazards,
  feeds,
  point,
  selectQuake,
  selectHazard,
  compact = false,
}: PlaceContextProps & {
  point: Coordinates;
  compact?: boolean;
  selectQuake?: (id: string) => void;
  selectHazard?: (id: string) => void;
}) {
  const quakes = useMemo(() => {
    void revision;
    return nearbyQuakes(feed, filters, at, now, point);
  }, [point, feed, filters, at, now, revision]);
  const distance = ({ lon, lat }: Coordinates) => distanceKm(point.lon, point.lat, lon, lat);
  const other = hazards.flatMap(({ rows }) => rows).filter((row) => distance(row) <= 500);
  const unavailable = feeds.rows.filter((row) => row.state === "failed" || row.state === "pending");
  const rows = [
    ...quakes.map(({ key, primary }) => ({
      id: key,
      name: primary.place || "Earthquake",
      detail: `${primary.magnitude.toFixed(1)} ${primary.scale || "magnitude"} · ${primary.source.toUpperCase()}`,
      km: distance(primary),
      time: primary.time,
      select: selectQuake,
    })),
    ...other.map((row) => ({
      id: row.id,
      name: row.name,
      detail: [row.kind, row.measure, row.source].filter(Boolean).join(" · "),
      km: distance(row),
      time: row.reportedAt,
      select: selectHazard,
    })),
  ]
    .sort((a, b) => a.km - b.km)
    .slice(0, 4);
  return (
    <>
      {(!compact || rows.length > 0) && (
        <p>Within 500 km · selected layers and time window{!compact && ". Available reports only."}</p>
      )}
      {rows.length > 0 ? (
        <>
          <p>
            {quakes.length} earthquake{quakes.length === 1 ? "" : "s"} · {other.length} other reported event
            {other.length === 1 ? "" : "s"}
          </p>
          <ul>
            {rows.map(({ id, name, detail, km, time, select }) => (
              <li key={id}>
                {select ? (
                  <button type="button" onClick={() => select(id)}>
                    {name}
                  </button>
                ) : (
                  <strong>{name}</strong>
                )}
                <span>
                  {detail} · {Math.round(km)} km away
                </span>
                {time != null && <time dateTime={new Date(time).toISOString()}>{layerTime(time)}</time>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          {compact ? "No matching reports within 500 km." : "No matching reports from the available feeds."}
        </p>
      )}
      {unavailable.length > 0 && (
        <p role="status">
          Some sources have not answered: {unavailable.map((row) => row.label).join(", ")}. Missing reports
          are not evidence of no activity.
        </p>
      )}
      {!selectQuake && (
        <p>
          Weather overlays keep their own displayed scan or forecast times. Counts describe reports, not
          conditions everywhere in the region.
        </p>
      )}
    </>
  );
}
