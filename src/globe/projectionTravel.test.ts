import { expect, it, vi } from "vitest";
import { createProjectionTravel } from "./projectionTravel";

it("keeps Fiji together across the map seam when returning to the original projection", () => {
  const scene = {
    setMorph: vi.fn(),
    cutawayOpen: () => false,
    controls: { setMorph: vi.fn(), framingReady: () => true },
  };
  const step = createProjectionTravel(scene, true, false);
  step(0.016, true, true, false);
  step(0.016, false, true, false);
  expect(step(0.016, true, false, false)).toBe(false);
  expect(scene.setMorph.mock.calls.map(([t]) => t)).toEqual([1, 0, 1]);
  expect(scene.controls.setMorph.mock.calls).toEqual(scene.setMorph.mock.calls);

  // The visitor's next independent projection change uses the ordinary world unfolding.
  expect(step(0.016, false, false, false)).toBe(true);
  expect(scene.setMorph.mock.lastCall?.[0]).toBeLessThan(1);
  expect(scene.setMorph.mock.lastCall?.[0]).toBeGreaterThan(0);
});
