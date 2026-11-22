import type { ObservationSource } from "../../app/observations/types";
import { HOUR, MINUTE, utc } from "./common";

const WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

function frameUrl(at: number) {
  return `${WMS}?${new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.1.1",
    LAYERS: "IMERG_Precipitation_Rate_30min",
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: "-180,-90,180,90",
    WIDTH: "1024",
    HEIGHT: "512",
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    TIME: utc(at).replace(".000Z", "Z"),
  })}`;
}

export const rain: ObservationSource = {
  refreshMs: 30 * MINUTE,
  async load(_option, _signal, restoreAt) {
    const cadence = 30 * MINUTE;
    const latest = Math.floor((Date.now() - 8 * HOUR) / cadence) * cadence;
    const end =
      restoreAt !== undefined && restoreAt % cadence === 0 && restoreAt < latest - 24 * HOUR
        ? restoreAt + 12 * HOUR
        : latest;
    return {
      target: { lon: -150, lat: 6, zoom: 0.9 },
      frames: Array.from({ length: 49 }, (_, index) => {
        const at = end - (48 - index) * cadence;
        return {
          at,
          raster: { url: frameUrl(at) },
          measurements: [{ label: "Satellite estimate", value: "Precipitation rate · mm/h" }],
        };
      }),
      initial: 48,
      note: "NASA IMERG precipitation-rate estimates. Half-hour frames arrive several hours after observation. Missing frames are labeled individually.",
    };
  },
};
