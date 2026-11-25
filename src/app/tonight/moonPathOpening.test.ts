import { expect, it } from "vitest";
import { aimAt, localNight, skyBodies } from "../../geo/tonight";
import { skyCities } from "./cities";
import { moonPathOpening } from "./moonPathOpening";

it("keeps an active night open after local midnight", () => {
  const city = skyCities[0]!;
  const now = Date.parse("2026-11-26T06:30:00Z");
  const previous = localNight(city, now - 12 * 3_600_000);
  const opening = moonPathOpening(city, now);
  expect(opening).toMatchObject({ city: city.name, target: "Moon", nightStart: previous.start });
  expect(opening.at).toBeGreaterThanOrEqual(now);
  expect(opening.at).toBeLessThanOrEqual(previous.end);
  expect(opening.look).toEqual(aimAt(skyBodies(city, opening.at)[0]!));
});

it("finds a later night in the same city when the Moon cannot be inspected tonight", () => {
  const city = skyCities.find(({ name }) => name === "Tokyo")!;
  const now = Date.parse("2026-11-09T10:00:00Z");
  const tonight = localNight(city, now);
  const opening = moonPathOpening(city, now);
  const moon = skyBodies(city, opening.at)[0]!;
  expect(opening).toMatchObject({ city: city.name, target: "Moon", trail: true, look: aimAt(moon) });
  expect(opening.nightStart).toBeGreaterThan(tonight.end);
  expect(moon.altitude).toBeGreaterThan(7);
});
