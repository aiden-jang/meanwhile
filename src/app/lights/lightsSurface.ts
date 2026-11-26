import { lightsBounds, lightsCorners } from "../../sources/observations/blackMarble";

export const lightsCities = [
  { id: "mayaguez", name: "Mayagüez", lon: -67.14, lat: 18.2 },
  { id: "ponce", name: "Ponce", lon: -66.61, lat: 18.01 },
  { id: "san-juan", name: "San Juan", lon: -66.105, lat: 18.46 },
] as const;

type Point = { lon: number; lat: number };
export type LightsPlace = { point: Point; city?: (typeof lightsCities)[number]["id"] };
const [west, south, east, north] = lightsBounds;

export function cityPlace(city: (typeof lightsCities)[number]): LightsPlace {
  return { point: { lon: city.lon, lat: city.lat }, city: city.id };
}

export function clampLightsPoint(point: Point): Point {
  return {
    lon: Math.max(west + 0.035, Math.min(east - 0.035, point.lon)),
    lat: Math.max(south + 0.025, Math.min(north - 0.025, point.lat)),
  };
}

export function lightsPlace(chapter?: string): LightsPlace {
  const value = chapter?.startsWith("lens:") ? chapter.slice(5) : undefined;
  const city = lightsCities.find(({ id }) => value === id);
  if (city) return cityPlace(city);
  const parts = value?.split(",");
  if (parts?.length === 2 && parts.every((part) => /^-?\d+(\.\d+)?$/.test(part))) {
    const [lon, lat] = parts.map(Number);
    if (lon! >= west && lon! <= east && lat! >= south && lat! <= north)
      return { point: clampLightsPoint({ lon: lon!, lat: lat! }) };
  }
  return cityPlace(lightsCities[2]);
}

export function lightsChapter(place: LightsPlace) {
  return "lens:" + (place.city ?? place.point.lon.toFixed(5) + "," + place.point.lat.toFixed(5));
}

export const lightsPlaceName = ({ city }: LightsPlace) =>
  lightsCities.find(({ id }) => id === city)?.name ?? "Pinned location";

function registeredPixel(point: Point) {
  const [sw, se, nw, ne] = lightsCorners;
  let u = (point.lon - west) / (east - west);
  let v = (point.lat - south) / (north - south);
  for (let i = 0; i < 3; i++) {
    const southLon = sw.lon + (se.lon - sw.lon) * u;
    const southLat = sw.lat + (se.lat - sw.lat) * u;
    const northLon = nw.lon + (ne.lon - nw.lon) * u;
    const northLat = nw.lat + (ne.lat - nw.lat) * u;
    const duLon = (se.lon - sw.lon) * (1 - v) + (ne.lon - nw.lon) * v;
    const duLat = (se.lat - sw.lat) * (1 - v) + (ne.lat - nw.lat) * v;
    const dvLon = northLon - southLon;
    const dvLat = northLat - southLat;
    const lon = point.lon - (southLon + dvLon * v);
    const lat = point.lat - (southLat + dvLat * v);
    const determinant = duLon * dvLat - dvLon * duLat;
    u += (lon * dvLat - lat * dvLon) / determinant;
    v += (lat * duLon - lon * duLat) / determinant;
  }
  return { u, v: 1 - v };
}

export function drawLightsCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, point: Point) {
  const { u, v } = registeredPixel(point);
  const { naturalWidth, naturalHeight } = image;
  const width = naturalWidth * 0.205;
  const height = (width * canvas.height) / canvas.width;
  const x = Math.max(0, Math.min(u * naturalWidth - width / 2, naturalWidth - width));
  const y = Math.max(0, Math.min(v * naturalHeight - height / 2, naturalHeight - height));
  canvas.getContext("2d")?.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);
}
