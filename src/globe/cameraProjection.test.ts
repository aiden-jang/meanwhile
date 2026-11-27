import { PerspectiveCamera, Vector3 } from "three";
import { expect, it } from "vitest";
import { toVec3 } from "../geo/sphere";
import { createUnfoldCamera } from "./cameraProjection";
import { unfoldPoint } from "./morph";

it("keeps the geographic aim centered without jumping on the first frame", () => {
  const camera = new PerspectiveCamera(46, 1.4, 0.01, 100);
  const view = createUnfoldCamera(camera);
  const lon = -49.643;
  const lat = 59.915;
  const distance = 3.2;
  const initial = new Vector3(...toVec3(lon, lat, distance));

  view.place(lon, lat, distance, 0.00001);
  expect(camera.position.distanceTo(initial)).toBeLessThan(0.001);

  for (const t of [0.01, 0.2, 0.5, 0.8, 0.99, 1]) {
    view.place(lon, lat, distance, t);
    camera.updateMatrixWorld();
    const screen = unfoldPoint(new Vector3(), lon, lat, t).project(camera);
    expect(screen.x).toBeCloseTo(0, 7);
    expect(screen.y).toBeCloseTo(0, 7);
  }
});

it("keeps a lifted local survey over its ground coordinates at regional magnification", () => {
  const camera = new PerspectiveCamera(46, 1.4, 0.01, 100);
  camera.zoom = 235;
  camera.updateProjectionMatrix();
  for (const [lon, lat] of [
    [-154.87, 19.51],
    [59.7, 45.35],
    [-49.55, 69.15],
  ] as const) {
    const view = createUnfoldCamera(camera);
    view.setLocalSurvey(true);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      view.place(lon, lat, 2.2, t);
      camera.updateMatrixWorld();
      const sample = unfoldPoint(new Vector3(), lon, lat, t, 0.009 * (1 - 0.8 * t)).project(camera);
      expect(Math.abs(sample.x)).toBeLessThan(0.001);
      expect(Math.abs(sample.y)).toBeLessThan(0.001);
    }
  }
});
