import type { ObservationRaster } from "../observations/types";

export const fissure = { lon: -154.918, lat: 19.463, zoom: 2.4 };
export const coastalSurvey = { lon: -154.818, lat: 19.514, zoom: 2.4 };
export const lens = { globe: 82, map: 235 };
export const surveyLens = { globe: 100, map: 295 };
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
