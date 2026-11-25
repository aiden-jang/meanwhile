import { moonPosition, moonRadii } from "./moon";
import { planetPositions } from "./planets";
import { horizontal, localNight, type SkyCity, type SkyLook } from "./tonight";

export type SkyTrailPoint = SkyLook & { at: number };

const moonNights = new WeakMap<SkyCity, { start: number; end: number; points: SkyTrailPoint[] }>();

export function moonNight(city: SkyCity, start: number) {
  const cached = moonNights.get(city);
  if (cached?.start === start) return cached;
  const { end } = localNight(city, start);
  const night = { start, end, points: timedNightTrail(city, "Moon", start, end) };
  moonNights.set(city, night);
  return night;
}

export function nightTrail(city: SkyCity, name: string, start: number, end: number): SkyLook[] {
  return timedNightTrail(city, name, start, end).map(({ azimuth, altitude }) => ({ azimuth, altitude }));
}

function timedNightTrail(city: SkyCity, name: string, start: number, end: number): SkyTrailPoint[] {
  function position(at: number) {
    if (name === "Moon") {
      const moon = moonPosition(at);
      return horizontal(city, moon, moonRadii(moon.distanceKm));
    }
    const planet = planetPositions(at).find((candidate) => candidate.name === name);
    return planet && horizontal(city, planet);
  }

  const points: SkyTrailPoint[] = [];
  const steps = Math.max(1, Math.ceil((end - start) / 600_000));
  let previousAt = start;
  for (let i = 0; i <= steps; i++) {
    const at = start + ((end - start) * i) / steps;
    const look = position(at);
    if (!look) return [];
    const previous = points.at(-1);
    if (previous && previous.altitude > 0 !== look.altitude > 0) {
      let lo = previousAt;
      let hi = at;
      while (hi - lo > 1000) {
        const middle = (lo + hi) / 2;
        if (position(middle)!.altitude > 0 === previous.altitude > 0) lo = middle;
        else hi = middle;
      }
      const crossing = (lo + hi) / 2;
      points.push({ azimuth: position(crossing)!.azimuth, altitude: 0, at: crossing });
    }
    points.push({ ...look, at });
    previousAt = at;
  }
  return points;
}
