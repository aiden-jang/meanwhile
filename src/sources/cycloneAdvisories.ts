import { num, parseUtc } from "./gdacs";

export interface CycloneFix {
  lon: number;
  lat: number;
  at: number | null;
  windKmh: number | null;
  pressureHpa: number | null;
}

const endpoint = "https://www.gdacs.org/gdacsapi/api";
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function advisoryTime(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const parts = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{2}):(\d{2})$/.exec(raw.trim());
  if (!parts) return parseUtc(raw);
  const [, day, month, year, hour, minute] = parts;
  const index = months.indexOf(month!);
  if (index < 0) return null;
  return parseUtc(
    `${year}-${String(index + 1).padStart(2, "0")}-${day!.padStart(2, "0")}T${hour}:${minute}:00Z`,
  );
}

const nonEmpty = (value: unknown) => (typeof value === "string" && !value.trim() ? null : value);

export function parseCycloneAdvisories(payload: unknown): CycloneFix[] {
  const items = (payload as { channel?: { item?: unknown } } | null)?.channel?.item;
  if (!Array.isArray(items)) return [];
  const fixes = new Map<number, CycloneFix>();
  for (const item of items as (Record<string, unknown> | null)[]) {
    if (!item || String(item["actual"]).toLowerCase() !== "true") continue;
    const at = advisoryTime(item["advisory_datetime"]);
    const lon = num(nonEmpty(item["longitude"]));
    const lat = num(nonEmpty(item["latitude"]));
    if (at === null || lon === null || lat === null || Math.abs(lon) > 180 || Math.abs(lat) > 90) continue;
    const wind = num(item["wind_speed"]);
    const pressure = num(item["pressure"]);
    fixes.set(at, {
      at,
      lon,
      lat,
      windKmh: wind !== null && wind > 0 ? wind * 3.6 : null,
      pressureHpa: pressure !== null && pressure >= 800 && pressure <= 1100 ? pressure : null,
    });
  }
  return [...fixes.values()].sort((a, b) => a.at! - b.at!);
}

export async function fetchCycloneAdvisories(
  id: string,
  episode: string,
  source: string | null,
  signal: AbortSignal,
): Promise<CycloneFix[]> {
  if (!/^\d+$/.test(id) || !/^\d+$/.test(episode)) return [];
  const bounded = AbortSignal.any([signal, AbortSignal.timeout(12000)]);
  const details = await fetch(
    `${endpoint}/events/getepisodedata?eventtype=TC&eventid=${id}&episodeid=${episode}`,
    {
      signal: bounded,
    },
  );
  if (!details.ok) throw new Error("Cyclone advisory unavailable");
  const impacts = (await details.json())?.properties?.impacts as
    { source?: string; resource?: { timeline?: string } }[] | undefined;
  if (!Array.isArray(impacts)) return [];
  const preferred = impacts.find((row) => row?.source === source && row.resource?.timeline);
  const timeline = (source ? preferred : impacts.find((row) => row?.resource?.timeline))?.resource?.timeline;
  const key =
    typeof timeline === "string" &&
    /^https:\/\/www\.gdacs\.org\/gdacsapi\/api\/export\/gettimeline\?id=(\d+)$/i.exec(timeline);
  if (!key) return [];
  const response = await fetch(`${endpoint}/export/gettimeline?id=${key[1]}`, { signal: bounded });
  if (!response.ok) throw new Error("Cyclone track unavailable");
  return parseCycloneAdvisories(await response.json());
}
