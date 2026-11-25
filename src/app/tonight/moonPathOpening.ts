import { moonNight } from "../../geo/nightTrail";
import { aimAt, localNight, openingSky, skyBodies, type SkyCity } from "../../geo/tonight";
import type { SkyPosition } from "./skyMoment";

const MINUTE = 60_000;
const HALF_DAY = 12 * 60 * MINUTE;

export function moonPathOpening(city: SkyCity, now: number): SkyPosition {
  const previous = localNight(city, now - HALF_DAY);
  const opening = now >= previous.start && now < previous.end ? previous : localNight(city, now);
  let night = opening;
  const minute = Math.ceil(now / MINUTE) * MINUTE;
  for (let day = 0; day < 32; day++) {
    const point = moonNight(city, night.start).points.find(
      ({ at, altitude }) => at >= minute && altitude >= 8,
    );
    if (point) {
      const at = Math.round(point.at / MINUTE) * MINUTE;
      return {
        city: city.name,
        at,
        nightStart: night.start,
        look: aimAt(skyBodies(city, at)[0]!),
        target: "Moon",
        trail: true,
      };
    }
    night = localNight(city, night.end + HALF_DAY);
  }
  const { at, look } = openingSky(city, opening.start, opening.end);
  return { city: city.name, at, nightStart: opening.start, look };
}
