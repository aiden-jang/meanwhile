import { expect, it } from "vitest";
import { showsSatellite, type SurfaceView } from "./earthBasemap";

const live: SurfaceView = {
  landing: true,
  globePresentation: "landing",
  cutaway: null,
  inspection: null,
};
const layers = { kind: "map-layers", observation: null, radar: null } as const;

it("keeps one photographic Earth through landing and Explore", () => {
  expect(showsSatellite(live)).toBe(true);
  expect(showsSatellite({ ...live, globePresentation: { ...layers, base: "dayline" } })).toBe(true);
  expect(showsSatellite({ ...live, globePresentation: "dayline" })).toBe(true);
  expect(showsSatellite({ ...live, globePresentation: { ...layers, base: "landing" } })).toBe(true);
  expect(showsSatellite({ ...live, landing: false, globePresentation: layers })).toBe(true);
  expect(showsSatellite({ ...live, landing: false, globePresentation: null })).toBe(true);
});

it("releases the surface to stories, cutaways and recorded event inspections", () => {
  expect(showsSatellite({ ...live, landing: false, globePresentation: { ...layers, base: "dayline" } })).toBe(
    false,
  );
  expect(showsSatellite({ ...live, globePresentation: "planetarium" })).toBe(false);
  expect(showsSatellite({ ...live, cutaway: {} })).toBe(false);
  expect(showsSatellite({ ...live, inspection: {} })).toBe(false);
});
