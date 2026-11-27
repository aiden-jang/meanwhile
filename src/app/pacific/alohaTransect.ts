import elevations from "./aloha-transect.json";
import { alohaStation } from "./pacificMoment";

export const north = { lon: alohaStation.lon, lat: 23.55 };
export const south = { lon: alohaStation.lon, lat: 21.15 };
export const east = -156.78;
export const oahu = { lon: -157.94, lat: 21.46 };
export const stationAlong = (1000 * (north.lat - alohaStation.lat)) / (north.lat - south.lat);
export const transectMeters = ((north.lat - south.lat) * Math.PI * 6371000) / 180;
export const sectionBase = 5140;
function sectionPaths(samples: number[]) {
  const bed = samples.map((z, i) => `${((i * 1000) / (samples.length - 1)).toFixed(2)} ${Math.max(0, -z)}`);
  const floor = `M${bed.join("L")}`;
  return { water: `M0 0H1000L${bed.reverse().join("L")}Z`, floor, rock: `${floor}V${sectionBase}H0Z` };
}
export const meridian = sectionPaths(elevations.meridian);
export const southernEdge = sectionPaths(elevations.south);
