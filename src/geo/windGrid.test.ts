import { expect, it } from "vitest";
import { windAt, windBearing, type WindGrid } from "./windGrid";
const grid: WindGrid = {
  columns: 4,
  rows: 2,
  west: 180,
  north: 3,
  dx: 90,
  dy: -6,
  east: Float32Array.of(0, 4, 8, 12, 0, 4, 8, 12),
  northward: Float32Array.of(2, 2, 2, 2, 6, 6, 6, 6),
};

it("interpolates vector components through the seam and respects the grid boundary", () => {
  expect(windAt(grid, 135, 0)).toEqual({ east: 6, north: 4, speed: Math.hypot(6, 4) });
  expect(windAt(grid, -225, 0)).toEqual(windAt(grid, 135, 0));
  expect(windAt(grid, 180, -3)?.north).toBe(6);
  expect(windAt(grid, 45, -5)).toBeNull();
  expect(windBearing(3, 0)).toBe("E");
  expect(windBearing(-2, 2)).toBe("NW");
});
