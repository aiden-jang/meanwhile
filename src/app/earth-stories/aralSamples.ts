import type { GeoPoint } from "../observations/types";
import sampleUrl from "../../sources/earth-atlas/aral-samples.bin?url";

const columns = 125,
  rows = 100,
  stride = 7;
export const defaultWaterCell = 5328;
export const waterStates = [
  "No observation",
  "Exposed lakebed",
  "Seasonal water",
  "Permanent water",
] as const;
export const waterColors = ["#938b9a", "#c8a876", "#68c5cd", "#408eac"];
let table: Promise<Uint8Array> | undefined;

export function aralSamples() {
  return (table ??= fetch(sampleUrl, { signal: AbortSignal.timeout(15000) })
    .then(async (response) => {
      if (!response.ok) throw new Error("Water observations unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== columns * rows * stride) throw new Error("Incomplete water observations");
      return bytes;
    })
    .catch((error) => {
      table = undefined;
      throw error;
    }));
}

export function waterPoint(bytes: Uint8Array, cell: number): GeoPoint | undefined {
  const offset = bytes[cell * stride];
  if (offset === undefined || offset > 15) return undefined;
  return {
    lon: 57 + (4 * (cell % columns) + (offset % 4) + 0.5) * 0.01,
    lat: 47 - (4 * Math.floor(cell / columns) + Math.floor(offset / 4) + 0.5) * 0.01,
  };
}

export function waterClass(bytes: Uint8Array, cell: number, yearIndex: number) {
  const packed = bytes[cell * stride + 1 + Math.floor(yearIndex / 4)]!;
  return (packed >> (2 * (yearIndex % 4))) & 3;
}

export function closestWater(bytes: Uint8Array, point: GeoPoint) {
  const col = Math.floor((point.lon - 57) / 0.04),
    row = Math.floor((47 - point.lat) / 0.04);
  let best: number | undefined,
    distance = 0.055 ** 2;
  for (let y = Math.max(0, row - 2); y <= Math.min(rows - 1, row + 2); y++) {
    for (let x = Math.max(0, col - 2); x <= Math.min(columns - 1, col + 2); x++) {
      const cell = y * columns + x,
        p = waterPoint(bytes, cell);
      if (!p) continue;
      const d = ((p.lon - point.lon) * 0.71) ** 2 + (p.lat - point.lat) ** 2;
      if (d < distance) {
        distance = d;
        best = cell;
      }
    }
  }
  return best;
}
