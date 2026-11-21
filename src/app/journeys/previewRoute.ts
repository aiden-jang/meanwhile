import { DEG, distanceKm, toVec3 } from "../../geo/sphere";
import type { SkyCity } from "../../geo/tonight";
import { storyPlace, type StoryPlace } from "../discovery/places";
import { firstFloatProfile } from "../float/firstProfile";
import type { Journey } from "./catalogue";

export const featuredJourney = "ice-in-motion";

const anchors: Record<string, StoryPlace> = {
  rain: { lon: -126, lat: 42, label: "Pacific coast" },
  river: { lon: -73.58, lat: 43.26, label: "Hudson River" },
  drifter: { lon: -87.064, lat: 28.872, label: "Gulf of Mexico" },
  float: { ...firstFloatProfile, label: "North Atlantic" },
  smoke: { lon: -76.6, lat: 47.1, label: "Eastern Canada" },
  tsunami: { lon: -73.24, lat: -36.12, label: "Central Chile" },
  tide: { lon: -74.0142, lat: 40.7006, label: "New York Harbor" },
};

export function previewPlaces(journey: Journey, city: SkyCity) {
  return journey.steps.flatMap(({ id }, index) => {
    const place =
      id === "sky" ? { lon: city.lon, lat: city.lat, label: city.name } : (anchors[id] ?? storyPlace(id));
    return place ? [{ ...place, number: index + 1 }] : [];
  });
}

export function previewCamera(places: readonly StoryPlace[], map: boolean) {
  const first = places[0];
  if (!first) return;
  let distance = 0;
  let ends = [first, first];
  for (const a of places) {
    for (const b of places) {
      const span = distanceKm(a.lon, a.lat, b.lon, b.lat);
      if (span > distance) {
        distance = span;
        ends = [a, b];
      }
    }
  }
  const [a, b] = ends.map(({ lon, lat }) => toVec3(lon, lat, 1));
  const [x, y, z] = a!.map((value, axis) => value + b![axis]!) as [number, number, number];
  if (map) return { lon: Math.atan2(x, z) / DEG, lat: 0, zoom: 0.94 };
  return {
    lon: Math.atan2(x, z) / DEG,
    lat: Math.atan2(y, Math.hypot(x, z)) / DEG,
    zoom: places.length === 1 ? 1.05 : 0.85,
  };
}
