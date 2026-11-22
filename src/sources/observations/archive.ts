import type { ObservationSource } from "../../app/observations/types";
import { HOUR, MINUTE } from "./common";
import { chileTsunami } from "../../app/journeys/coastRoute";
import { dartReading, tsunamiBuoys, tsunamiEpoch } from "./tsunamiRecord";
import scans from "./smoke-scans.json";

const images = import.meta.glob<string>("./archive-assets/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const asset = (name: string) => images[`./archive-assets/${name}.webp`]!;
const SMOKE_BOUNDS = [-91, 34, -60, 55] as const;

const smokeCities = [
  { id: "region", label: "Northeastern United States", lon: -76, lat: 43, zoom: 2.35 },
  { id: "quebec", label: "Québec City", lon: -71.208, lat: 46.8139, zoom: 2.85 },
  { id: "new-york", label: "New York", lon: -74.006, lat: 40.7128, zoom: 2.85 },
  { id: "philadelphia", label: "Philadelphia", lon: -75.164, lat: 39.9526, zoom: 2.85 },
] as const;

export const smoke: ObservationSource = {
  options: smokeCities,
  async load(option) {
    const city = smokeCities.find(({ id }) => id === option) ?? smokeCities[0];
    return {
      target: city,
      lens: { globe: 1.45, map: 1.6 },
      frames: scans.map(([at], index) => ({
        at: Number(at),
        raster: { url: asset(`smoke-${index}`), bounds: SMOKE_BOUNDS, opacity: 0.95 },
        marks: [
          { lon: -74.006, lat: 40.7128, size: 14 },
          { lon: -71.208, lat: 46.8139, size: 11 },
          { lon: -75.164, lat: 39.9526, size: 9 },
        ],
        measurements: [{ label: "Instrument", value: "GOES-16 ABI" }],
      })),
      note: "Recorded June 6–8, 2023. The five frames combine observed red, blue and near-infrared channels. The image shows the plume from above.",
    };
  },
};

const EPICENTRE = { ...chileTsunami, zoom: 2.4 };
const pacific = { lon: -109, lat: 1, zoom: 1.04 };

export const tsunami: ObservationSource = {
  options: tsunamiBuoys,
  async load(option) {
    const chosen = tsunamiBuoys.find(({ id }) => id === option) ?? tsunamiBuoys[0]!;
    return {
      target: pacific,
      frames: Array.from({ length: 25 }, (_, hour) => {
        const at = tsunamiEpoch + hour * HOUR;
        const actual = dartReading(chosen, at);
        return {
          at,
          ...(hour <= 1 ? { camera: EPICENTRE } : {}),
          raster: { url: asset(`tsunami-${hour}`) },
          modeledArrival: {
            at: chosen.arrivalAt,
            lon: chosen.lon,
            lat: chosen.lat,
            ...(actual ? { sampleAt: actual[0] } : {}),
          },
          marks: [
            { ...chileTsunami, size: 20, color: 0xffd09c },
            ...tsunamiBuoys.map(({ id, lon, lat }) => ({
              id,
              lon,
              lat,
              size: chosen.id === id ? (at === chosen.arrivalAt ? 30 : 21) : 12,
              color: chosen.id === id ? (at >= chosen.arrivalAt ? 0xb9f4f1 : 0x79becf) : 0x8a9bb4,
            })),
          ],
          measurements: [
            { label: "Modeled arrival · time since the earthquake", value: `${hour} h` },
            {
              label: "Measured water-level change at buoy",
              value: actual ? `${actual[1].toFixed(3)} m` : "No sample nearby",
            },
          ],
        };
      }),
      units: "m",
      series: [{ label: "Measured water-level change", samples: chosen.samples, gapAfter: 5 * MINUTE }],
      note: "Illustrative first-arrival model calculated from NOAA ETOPO bathymetry. The glowing front shows estimated travel time. The gauge plot uses separate NOAA DART observations after tide removal.",
    };
  },
};
