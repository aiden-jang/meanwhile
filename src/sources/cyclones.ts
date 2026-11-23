import { hasGdacsFeatures, parseUtc, reportedBy } from "./gdacs";
/* Tropical cyclones, as tracks rather than dots. A storm drawn as a point is a dot that happens to be a
   hurricane; drawn as a track it explains itself, curving poleward as every cyclone does. Only what is
   happening now. GDACS lists 99 and flags 3 `iscurrent`; the other 96 are dead storms. See ARCHITECTURE.md#srcsourcescyclonests. */

const LIST =
  "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH" +
  "?eventlist=TC&alertlevel=Green;Orange;Red";

const GEOMETRY = "https://www.gdacs.org/gdacsapi/api/polygons/getgeometry";

/** Beyond this a track segment is a wrap across the antimeridian, not a storm crossing it. */
const WRAP_DEG = 170;

export interface Cyclone {
  id: string;
  episode?: string;
  /** The agency that reported it, or null when the feed did not say. */
  source: string | null;
  name: string;
  /** Where it is now. */
  lon: number;
  lat: number;
  /** Strongest wind over the storm's life, in km/h, or null when not published. See ARCHITECTURE.md#srcsourcescyclonests. */
  peakKmh: number | null;
  /** Where it has been, oldest first, as one polyline. Empty when the track could not be had. */
  track: { lon: number; lat: number }[];
  /** First reported, or null. */
  startedAt: number | null;
  /** Last reported, not forecast to end: GDACS flags a storm current past this date. See `age.ts`. */
  endedAt: number | null;
}

interface Feature {
  geometry?: { type?: unknown; coordinates?: unknown };
  properties?: Record<string, unknown>;
}

/** The current storms out of the event list, without their tracks. */
export function parseCycloneList(payload: unknown): Omit<Cyclone, "track">[] {
  const features = (payload as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];
  const out: Omit<Cyclone, "track">[] = [];
  for (const raw of features as Feature[]) {
    const p = raw.properties;
    if (!p || String(p["iscurrent"]) !== "true") continue;
    const coords = raw.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [lon, lat] = coords as [unknown, unknown];
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    const severity = (p["severitydata"] as { severity?: unknown } | undefined)?.severity;
    out.push({
      id: String(p["eventid"] ?? ""),
      // Who reported it. See `reportedBy`.
      source: reportedBy(p),
      name: String(p["eventname"] ?? p["name"] ?? "unnamed"),
      lon,
      lat,
      peakKmh: typeof severity === "number" && severity > 0 ? severity : null,
      startedAt: parseUtc(p["fromdate"]),
      endedAt: parseUtc(p["todate"]),
      // Carried so the geometry request can be built without guessing at it.
      episode: String(p["episodeid"] ?? ""),
    });
  }
  return out;
}

/** The track out of a storm's geometry payload, oldest point first. See ARCHITECTURE.md#srcsourcescyclonests. */
export function parseTrack(payload: unknown): { lon: number; lat: number }[] {
  const features = (payload as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];

  const segments: [number, number][][] = [];
  for (const raw of features as Feature[]) {
    if (raw.geometry?.type !== "LineString" || String(raw.properties?.["forecast"]).toLowerCase() === "true")
      continue;
    const coords = raw.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const points = coords.filter(
      (c): c is [number, number] => Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number",
    );
    if (points.length >= 2) segments.push(points);
  }
  if (segments.length === 0) return [];

  const startAt = new Map(segments.map((segment) => [String(segment[0]), segment]));
  const ends = new Set(segments.map((segment) => String(segment.at(-1))));
  const starts = segments.filter((segment) => !ends.has(String(segment[0])));
  let longest: [number, number][] = [];
  for (const start of starts.length ? starts : segments.slice(0, 1)) {
    const chain = [...start];
    const visited = new Set([start]);
    let next = startAt.get(String(chain.at(-1)));
    while (next && !visited.has(next)) {
      visited.add(next);
      chain.push(...next.slice(1));
      next = startAt.get(String(next.at(-1)));
    }
    if (chain.length > longest.length) longest = chain;
  }
  const chained = longest.map(([lon, lat]) => ({ lon, lat }));

  return chained.filter((p, i, all) => {
    if (i === 0) return true;
    return Math.abs(p.lon - all[i - 1]!.lon) <= WRAP_DEG;
  });
}

/** Saffir-Simpson from a wind speed, since GDACS's own label describes a different moment. */
export function category(kmh: number | null): string | null {
  if (kmh === null || !Number.isFinite(kmh) || kmh < 63) return null;
  if (kmh >= 252) return "category 5";
  if (kmh >= 209) return "category 4";
  if (kmh >= 178) return "category 3";
  if (kmh >= 154) return "category 2";
  if (kmh >= 119) return "category 1";
  return "tropical storm";
}

/**
 * Current storms with their tracks, or an empty list on any failure. One request for the list and one per
 * current storm, which is three. Each is 370kB for the 28kB of track inside it, which is the price of an
 * endpoint that returns cones and wind rings with the line. Ninety-nine would not have been worth it.
 */
export async function fetchCyclones(
  get: (url: string) => Promise<Response> = fetch,
  onAnswer?: (ok: boolean) => void,
): Promise<Cyclone[]> {
  try {
    const res = await get(LIST);
    if (!res.ok) {
      onAnswer?.(false);
      return [];
    }
    const payload = await res.json();
    if (!hasGdacsFeatures(payload)) throw new Error("Unexpected GDACS cyclone list");
    const current = parseCycloneList(payload);
    // The list answered, which is what this reports. A storm whose track request fails is still a storm and
    // still drawn where it is, so a missing tail is not a dead feed.
    onAnswer?.(true);
    return await Promise.all(
      current.map(async (storm) => {
        const episode = storm.episode ?? "";
        try {
          const geo = await get(`${GEOMETRY}?eventtype=TC&eventid=${storm.id}&episodeid=${episode}`);
          if (!geo.ok) return { ...storm, track: [] };
          return { ...storm, track: parseTrack(await geo.json()) };
        } catch {
          // A storm without its track is still a storm, and still drawn where it is.
          return { ...storm, track: [] };
        }
      }),
    );
  } catch {
    onAnswer?.(false);
    return [];
  }
}
