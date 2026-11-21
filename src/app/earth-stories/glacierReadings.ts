import type { GeoPoint } from "../observations/types";

export interface GlacierReadings {
  bounds: readonly [number, number, number, number];
  columns: number;
  rows: number;
  samples: Record<"2013" | "2024", readonly number[]>;
}

export const glacierYears = ["2013", "2024"] as const;
export const glacierPlaces = [
  { label: "Near the fjord", lon: -49.54, lat: 69.14 },
  { label: "Upstream", lon: -49.43, lat: 69.11 },
  { label: "Inland ice", lon: -49.14, lat: 69.15 },
];

export function glacierCell(grid: GlacierReadings, { lon, lat }: GeoPoint): number | undefined {
  const [west, south, east, north] = grid.bounds;
  if (lon < west || lon > east || lat < south || lat > north) return undefined;
  const col = Math.round(((lon - west) / (east - west)) * (grid.columns - 1));
  const row = Math.round(((north - lat) / (north - south)) * (grid.rows - 1));
  return row * grid.columns + col;
}

export function glacierPoint(grid: GlacierReadings, cell: number): GeoPoint {
  const [west, south, east, north] = grid.bounds;
  return {
    lon: west + ((cell % grid.columns) / (grid.columns - 1)) * (east - west),
    lat: north - (Math.floor(cell / grid.columns) / (grid.rows - 1)) * (north - south),
  };
}
