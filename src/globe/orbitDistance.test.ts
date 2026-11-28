import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "three";
import { createOrbitDistance, ORBIT_FLOOR } from "./orbitDistance";

describe("camera zoom range", () => {
  it("extends the globe through its lens while staying outside the atmosphere", () => {
    const camera = new PerspectiveCamera(32, 1.6);
    const distance = createOrbitDistance(camera, 32);
    distance.fit(4, 4);
    expect(distance.at(1, 0)).toBe(4);
    expect(distance.at(2, 0)).toBe(2);
    expect(distance.at(12, 0)).toBeGreaterThanOrEqual(ORBIT_FLOOR);
    expect(distance.magnification(3, 0)).toBe(1);
    expect(distance.magnification(12, 0)).toBe(4);
    expect(distance.clamp(100, 0)).toBe(12);
    expect(distance.clamp(0.1, 0)).toBe(0.4);
  });
  it("lets the map approach its plane without the globe's altitude floor", () => {
    const distance = createOrbitDistance(new PerspectiveCamera(32, 0.5), 32);
    distance.fit(8, 4);
    expect(distance.at(12, 1)).toBeCloseTo(ORBIT_FLOOR / 4);
    expect(distance.at(12, 1)).toBeGreaterThan(0.1);
    expect(distance.magnification(12, 1)).toBe(1);
    const near = distance.at(3, 1),
      closer = distance.at(12, 1);
    expect(near / closer).toBeCloseTo(4);
    expect(distance.clamp(0.01, 1)).toBeLessThan(0.4);
    for (const t of [0.1, 0.5, 0.9]) {
      expect(distance.at(12, t)).toBeGreaterThan(closer);
      expect(distance.at(12, t)).toBeLessThan(distance.at(12, 0));
    }
  });
  it("keeps the same meridional scale when a live layer unfolds up close", () => {
    const distances = createOrbitDistance(new PerspectiveCamera(32, 1.6), 32);
    for (const fit of [4, 7.5]) {
      distances.fit(fit, 4);
      distances.setLayers(true);
      for (const zoom of [3.5, 5.5, 12]) {
        const ball = distances.magnification(zoom, 0) / (distances.at(zoom, 0) - 1);
        const sheet = ((2 / Math.PI) * distances.magnification(zoom, 1)) / distances.at(zoom, 1);
        expect(sheet).toBeCloseTo(ball);
      }
      expect(distances.region(1)).toBe(0);
      distances.setLayers(false);
      expect(distances.magnification(5.5, 1)).toBe(1);
    }
  });
  it("preserves existing story framing through the full globe-to-map transition", () => {
    const distance = createOrbitDistance(new PerspectiveCamera(32, 1.6), 32);
    distance.fit(4, 4);
    for (const zoom of [0.75, 1, 1.8, 2.85, 3]) {
      for (const morph of [0, 0.25, 0.5, 0.75, 1]) {
        expect(distance.at(zoom, morph)).toBeCloseTo(
          Math.max(ORBIT_FLOOR, (4 + (4 * 0.72 - 4) * morph) / zoom),
        );
        expect(distance.magnification(zoom, morph)).toBe(1);
      }
    }
  });
});
