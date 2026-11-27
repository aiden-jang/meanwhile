import { depthRecords } from "../data/depthRecords";
import type { SlabPoint } from "./slab";
import { DEG, EARTH_RADIUS_KM, toVec3 } from "./sphere";

export const FIJI_SECTION_KM = 900;
export const FIJI_SECTION_BASE_KM = 720;
export const FIJI_SECTION_HALF_WIDTH_KM = 100;

type Vector = readonly [number, number, number];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const [august, september] = depthRecords;
const westEvent = toVec3(september.lon, september.lat, 1);
const eastEvent = toVec3(august.lon, august.lat, 1);
const separation = Math.acos(Math.max(-1, Math.min(1, dot(westEvent, eastEvent))));
const startKm = (FIJI_SECTION_KM - separation * EARTH_RADIUS_KM) / 2;

const tangent = eastEvent.map((n, i) => (n - westEvent[i] * Math.cos(separation)) / Math.sin(separation)) as [
  number,
  number,
  number,
];
const normal: Vector = [
  westEvent[1] * tangent[2] - westEvent[2] * tangent[1],
  westEvent[2] * tangent[0] - westEvent[0] * tangent[2],
  westEvent[0] * tangent[1] - westEvent[1] * tangent[0],
];

function extend(km: number, northKm = 0) {
  const rad = (km - startKm) / EARTH_RADIUS_KM;
  const offset = northKm / EARTH_RADIUS_KM;
  const [x, y, z] = westEvent.map(
    (n, i) =>
      (n * Math.cos(rad) + tangent[i] * Math.sin(rad)) * Math.cos(offset) + normal[i] * Math.sin(offset),
  );
  return { lon: Math.atan2(x, z) / DEG, lat: Math.asin(y) / DEG };
}

export const FIJI_TRANSECT = { west: extend(0), east: extend(FIJI_SECTION_KM) };

export const FIJI_NORTH_EDGE = {
  west: extend(0, FIJI_SECTION_HALF_WIDTH_KM),
  east: extend(FIJI_SECTION_KM, FIJI_SECTION_HALF_WIDTH_KM),
};

export function fijiSectionFloor(depth: number) {
  return Math.min(FIJI_SECTION_BASE_KM, depth + 84 + 90 * Math.exp(-depth / 160));
}

export function projectFijiSection(lon: number, lat: number) {
  const p = toVec3(lon, lat, 1);
  return {
    alongKm: startKm + EARTH_RADIUS_KM * Math.atan2(dot(p, tangent), dot(p, westEvent)),
    offsetKm: EARTH_RADIUS_KM * Math.asin(Math.max(-1, Math.min(1, dot(p, normal)))),
  };
}

export function sectionCatalogue(table: readonly SlabPoint[]) {
  const paths = ["", "", ""];
  for (const [lon, lat, depth, magnitude] of table) {
    const { alongKm, offsetKm } = projectFijiSection(lon, lat);
    if (alongKm < 0 || alongKm > FIJI_SECTION_KM || Math.abs(offsetKm) > FIJI_SECTION_HALF_WIDTH_KM) continue;
    if (depth > FIJI_SECTION_BASE_KM) continue;
    const bin = magnitude < 5 ? 0 : magnitude < 5.5 ? 1 : 2;
    paths[bin] += `M${alongKm.toFixed(1)} ${depth}h.01`;
  }
  return paths;
}
