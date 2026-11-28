import type { ObservationRaster } from "../observations/types";
import { bounds, kapohoBay } from "./lavaTimeline";

export const coastalSurvey = { lon: -154.818, lat: 19.514, zoom: 2.4 };
export const lens = { globe: 82, map: 235, approachSeconds: 1.16 };
// The story sheet leaves a shallower map on short phones. Keep the two ends a drag apart.
export const shortPhoneLens = { ...lens, globe: 132, map: 390 };
export const surveyLens = { globe: 100, map: 295, approachSeconds: 1.16 };
// NAD83 / UTM 5N corners of the 3DEP tile, converted to geographic coordinates.
export const raster: ObservationRaster = {
  url: "",
  bounds: [-155.109, 19.314, -154.608, 19.736],
  corners: [
    { lon: -155.10338, lat: 19.31478 },
    { lon: -154.60863, lat: 19.31982 },
    { lon: -155.10876, lat: 19.73021 },
    { lon: -154.61275, lat: 19.73536 },
  ],
  opacity: 1,
};

const [west, south, east, north] = bounds as [number, number, number, number];
const [bayEast, bayNorth] = kapohoBay;

function coastFraction(fraction: number) {
  return (bayEast - 650 + (0.5 - fraction) * 13_000 - west) / (east - west);
}

export function coastlineDivider(percent: number) {
  if (percent <= 0) return 1;
  if (percent >= 100) return 0;
  return coastFraction(percent / 100);
}

export const coastHandle = {
  before: coastFraction(0),
  after: coastFraction(1),
  latitude: (bayNorth - south) / (north - south),
  reference: (bayEast - west) / (east - west),
};

export function shorelineOverlay(split: number) {
  return {
    surveyDivider: coastlineDivider(split),
    surveyHandle: { ...coastHandle, fraction: split / 100 },
  };
}
