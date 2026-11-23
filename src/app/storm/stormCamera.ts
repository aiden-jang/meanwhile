import type { Cyclone } from "../../sources/cyclones";

export function stormCamera(storm: Cyclone) {
  const { lon, lat } = storm;
  if (storm.track.length < 2) return { lon, lat, zoom: 2.2 };
  const turns = storm.track.map((point) => {
    const offset = point.lon - lon;
    return offset - Math.round(offset / 360) * 360;
  });
  const west = Math.min(0, ...turns);
  const east = Math.max(0, ...turns);
  const south = Math.min(lat, ...storm.track.map((point) => point.lat));
  const north = Math.max(lat, ...storm.track.map((point) => point.lat));
  const extent = Math.max(east - west, north - south);
  const phone = matchMedia("(max-width: 767px)").matches;
  return {
    lon: lon + (west + east) / 2,
    lat: (south + north) / 2,
    zoom: Math.max(1.65, Math.min(phone ? 11 : 6, (phone ? 120 : 48) / Math.max(1, extent))),
  };
}
