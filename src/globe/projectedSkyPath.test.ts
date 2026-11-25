import { expect, it } from "vitest";
import { nearestSkyTime, pathLine } from "./projectedSkyPath";

it("seeks along the arc in actual screen pixels", () => {
  const arc = [
    { x: 0, y: 100, at: 1000 },
    { x: 100, y: 0, at: 2000 },
  ];
  expect(nearestSkyTime(arc, 80, 60, 100, 100)).toBeCloseTo(1600);
  expect(nearestSkyTime(arc, 320, 60, 400, 100)).toBeCloseTo(1776.47);
});

it("keeps separate path segments apart when the Moon leaves the visible sky", () => {
  const arc = [
    { x: 0, y: 50, at: 1000 },
    { x: 25, y: 50, at: 2000 },
    null,
    { x: 75, y: 50, at: 3000 },
    { x: 100, y: 50, at: 4000 },
  ];
  expect(pathLine(arc)).toBe("M0.00 50.00 L25.00 50.00 M75.00 50.00 L100.00 50.00 ");
  expect(nearestSkyTime(arc, 60, 50, 100, 100)).toBe(3000);
});
