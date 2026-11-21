import type { GeoPoint, ObservationSource } from "../../app/observations/types";
import { distanceKm } from "../../geo/sphere";
import { HOUR } from "./common";
import surface from "./drifter-surface.json";
import tracks from "./drifter-tracks.json";

const RECENT = "4401657";
const GAP = 24 * HOUR;

function trackOverview(points: readonly { lon: number; lat: number }[], origin: number) {
  const longitude = points.map(({ lon }) => origin + ((((lon - origin) % 360) + 540) % 360) - 180);
  const latitude = points.map(({ lat }) => lat);
  const west = Math.min(...longitude),
    east = Math.max(...longitude);
  const south = Math.min(...latitude),
    north = Math.max(...latitude);
  const span = Math.max(east - west, 1.4 * (north - south));
  return {
    lon: (west + east) / 2,
    lat: (south + north) / 2,
    zoom: Math.min(2.8, Math.max(0.88, 140 / Math.max(26, span))),
  };
}

function recordedSurface() {
  return surface.map(([stamp, lat, lon, temperature], index) => {
    const at = Date.parse(String(stamp));
    const point = { lat: Number(lat), lon: Number(lon) };
    const previous = surface[index - 1];
    const elapsed = previous ? (at - Date.parse(String(previous[0]))) / 1000 : 0;
    const speed =
      previous && elapsed > 0
        ? (1000 * distanceKm(Number(previous[2]), Number(previous[1]), point.lon, point.lat)) / elapsed
        : undefined;
    return { at, ...point, speed, temperature: Number(temperature) };
  });
}

function trackSections(track: readonly (GeoPoint & { at: number })[]) {
  const sections: { start: number; points: GeoPoint[] }[] = [];
  track.forEach((point, i) => {
    const previous = track[i - 1];
    if (!previous || point.at - previous.at > GAP) sections.push({ start: i, points: [] });
    sections.at(-1)!.points.push(point);
  });
  return sections;
}

export const drifter: ObservationSource = {
  options: [
    ...tracks.map(({ id }) => ({ id, label: `Recorded loop · ${id}` })),
    { id: RECENT, label: `Surface temperatures · ${RECENT}` },
  ],
  async load(option) {
    const selected = tracks.find(({ id }) => id === option) ?? tracks[0]!;
    const temperatureTrack = option === RECENT;
    const track = temperatureTrack
      ? recordedSurface()
      : selected.values.map(([days, lat, lon, east, north]) => ({
          at: Math.round(days! * 24 * HOUR),
          lat: lat!,
          lon: ((lon! + 540) % 360) - 180,
          speed: Math.hypot(east!, north!),
          temperature: undefined,
        }));
    const first = track[0];
    if (!first) throw new Error("Recorded track is empty");
    const sections = trackSections(track);
    const outline = sections.map(({ points }) => ({ points, color: 0x42657c }));
    const frames = track.map((point, index) => ({
      at: point.at,
      camera: { lon: point.lon, lat: point.lat, zoom: 2.2 },
      paths: [
        ...outline,
        ...sections
          .filter(({ start }) => start < index)
          .map(({ start, points }) => ({ points: points.slice(0, index - start + 1), color: 0x89dfdf })),
      ],
      marks: [{ ...point, size: 24, color: 0xd9ffff }],
      measurements: [
        { label: "Drifter ID", value: temperatureTrack ? RECENT : selected.id },
        {
          label: temperatureTrack ? "Speed between recorded positions" : "Estimated surface speed",
          value: point.speed === undefined ? "First fix" : `${point.speed.toFixed(2)} m/s`,
        },
        ...(point.temperature === undefined
          ? []
          : [{ label: "Sea-surface temperature", value: `${point.temperature.toFixed(2)} °C` }]),
        {
          label: "Position",
          value: `${Math.abs(point.lat).toFixed(2)}° ${point.lat < 0 ? "S" : "N"}, ${Math.abs(point.lon).toFixed(2)}° ${point.lon < 0 ? "W" : "E"}`,
        },
      ],
    }));
    return {
      target: { lon: first.lon, lat: first.lat, zoom: 2.2 },
      mapTarget: trackOverview(track, first.lon),
      frames,
      series: [
        {
          label: temperatureTrack ? "Sea-surface temperature" : "Surface speed",
          samples: track.map(({ at, speed, temperature }) => [at, temperature ?? speed ?? 0]),
          gapAfter: GAP,
        },
      ],
      units: temperatureTrack ? "°C" : "m/s",
      note: temperatureTrack
        ? "Recorded NOAA surface drifter positions and temperature readings. Speed is calculated between consecutive fixes."
        : "NOAA’s quality-controlled positions and velocities. The bright track shows the fixes already played. Gaps longer than a day appear as breaks.",
    };
  },
};
