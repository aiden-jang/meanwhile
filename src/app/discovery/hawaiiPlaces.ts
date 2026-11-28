import { alohaStation } from "../pacific/pacificMoment";

// The mapped starting vent on the USGS lower East Rift Zone transect (NAD83 / UTM 5N).
export const fissureEight = { lon: -154.9098936, lat: 19.460775 };
export const hawaiiPlaces = [
  {
    id: "kilauea",
    trigger: "world-kilauea",
    point: fissureEight,
    title: "Kīlauea",
    reading: "Trace the 2018 flow",
  },
  {
    id: "pacific",
    trigger: "world-aloha",
    point: alohaStation,
    title: alohaStation.name,
    reading: "Descend the water column",
  },
] as const;

export function hawaiiDistance(lon: number, lat: number) {
  const delta = ((lon + 156.5 + 540) % 360) - 180;
  return Math.hypot(delta * 0.934, lat - 21);
}
