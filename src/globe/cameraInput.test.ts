import { afterEach, expect, test, vi } from "vitest";
import { PerspectiveCamera } from "three";
import { createControls } from "./controls";
import { attachCameraInput } from "./cameraInput";
import type { ScrubDepth } from "./descentInput";

afterEach(() => vi.unstubAllGlobals());

test("descent gestures share the canvas with orbit and pinch, then release it to Explore", () => {
  vi.stubGlobal("window", new EventTarget());
  const surface = Object.assign(new EventTarget(), { clientHeight: 800 });
  const scrub = vi.fn<ScrubDepth>();
  let owner: ScrubDepth | null = scrub;
  const drag = vi.fn(),
    zoom = vi.fn(),
    begin = vi.fn();
  const detach = attachCameraInput(surface as unknown as HTMLCanvasElement, {
    depthScrub: () => owner,
    blocked: () => false,
    drag,
    zoom,
    begin,
    grab: vi.fn(),
    release: vi.fn(),
    nudge: vi.fn(),
    reset: vi.fn(),
    change: vi.fn(),
  });
  const wheel = (deltaY: number, mode = 0, deltaX = 0, ctrlKey = false) => {
    const event = Object.assign(new Event("wheel", { cancelable: true }), {
      deltaY,
      deltaX,
      deltaMode: mode,
      ctrlKey,
      clientX: 200,
      clientY: 250,
    });
    surface.dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(wheel(0.5)).toBe(true);
  expect(wheel(-3, 1)).toBe(true);
  expect(wheel(1, 2)).toBe(true);
  expect(scrub.mock.calls).toEqual([
    [0.5 / (800 * 1.65), "wheel"],
    [-48 / (800 * 1.65), "wheel"],
    [1 / 1.65, "wheel"],
  ]);
  expect(wheel(1, 0, 40)).toBe(false);
  expect(zoom).not.toHaveBeenCalled();
  wheel(-12, 0, 0, true);
  expect(zoom).toHaveBeenCalledOnce();
  expect(scrub).toHaveBeenCalledTimes(3);

  const pointer = (type: string, id: number, x: number, y: number) =>
    surface.dispatchEvent(
      Object.assign(new Event(type), { button: 0, pointerId: id, clientX: x, clientY: y }),
    );
  pointer("pointerdown", 1, 100, 100);
  pointer("pointermove", 1, 101, 104);
  pointer("pointermove", 1, 101, 126);
  expect(scrub).toHaveBeenLastCalledWith(26 / (800 * 0.65), "drag");
  expect(begin).not.toHaveBeenCalled();
  expect(drag).not.toHaveBeenCalled();
  pointer("pointerdown", 2, 201, 126);
  pointer("pointermove", 2, 251, 126);
  expect(zoom).toHaveBeenLastCalledWith(1.5, 176, 126);
  expect(scrub).toHaveBeenCalledTimes(4);
  pointer("pointerup", 2, 251, 126);
  pointer("pointerup", 1, 101, 126);
  pointer("pointerdown", 1, 100, 100);
  pointer("pointermove", 1, 125, 102);
  pointer("pointermove", 1, 126, 125);
  pointer("pointerup", 1, 126, 125);
  expect(drag).toHaveBeenCalledTimes(2);
  expect(scrub).toHaveBeenCalledTimes(4);
  owner = null;
  expect(wheel(-120)).toBe(true);
  expect(zoom).toHaveBeenCalledTimes(3);
  expect(scrub).toHaveBeenCalledTimes(4);
  detach();
});

test("dragging at maximum zoom stays finite throughout the globe-to-map transition", () => {
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: true }),
    addEventListener() {},
    removeEventListener() {},
  });
  const surface = Object.assign(new EventTarget(), {
    clientWidth: 1000,
    clientHeight: 625,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 625 }),
  });
  for (const morph of [0, 0.1, 0.35, 0.49, 0.51, 0.8, 1]) {
    const camera = new PerspectiveCamera(32, 1.6);
    const controls = createControls(
      camera,
      surface as unknown as HTMLCanvasElement,
      { lon: 30, lat: 20 },
      32,
    );
    controls.setFit(4, 4);
    controls.flyTo(30, 20, 12);
    controls.setMorph(morph);
    const detach = controls.attach(() => {});
    for (const [type, x, y] of [
      ["pointerdown", 700, 250],
      ["pointermove", 710, 254],
      ["pointerup", 710, 254],
    ] as const)
      surface.dispatchEvent(
        Object.assign(new Event(type), { button: 0, pointerId: 1, clientX: x, clientY: y }),
      );
    const after = controls.state();
    expect(Object.values(after).every(Number.isFinite), `camera at morph ${morph}`).toBe(true);
    expect(after.lon).toBeLessThan(30);
    expect(after.lat).toBeGreaterThan(20);
    expect(after.zoom).toBe(12);
    detach();
  }
});

test("successive wheel events keep the same map point anchored while the camera eases", () => {
  const preference = { matches: true };
  vi.stubGlobal("window", {
    matchMedia: () => preference,
    addEventListener() {},
    removeEventListener() {},
  });
  const surface = Object.assign(new EventTarget(), {
    clientWidth: 1000,
    clientHeight: 625,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 625 }),
  });
  const camera = new PerspectiveCamera(32, 1.6);
  const controls = createControls(camera, surface as unknown as HTMLCanvasElement, { lon: 0, lat: 30 }, 32);
  controls.setFit(4, 4);
  controls.setMorph(1);
  controls.flyTo(0, 30, 1);
  controls.apply();
  const anchor = controls.pick(700, 250)!;
  const detach = controls.attach(() => {});
  preference.matches = false;
  for (let i = 0; i < 16; i++) {
    surface.dispatchEvent(
      Object.assign(new Event("wheel", { cancelable: true }), {
        deltaY: -25,
        clientX: 700,
        clientY: 250,
      }),
    );
    controls.step(1 / 120);
    controls.apply();
  }
  for (let i = 0; i < 600; i++) {
    controls.step(1 / 60);
    controls.apply();
  }
  const result = controls.project(anchor.lon, anchor.lat)!;
  expect(result.x).toBeCloseTo(700, 1);
  expect(result.y).toBeCloseTo(250, 1);
  expect(controls.state().zoom).toBeCloseTo(Math.exp(16 * 25 * 0.0011), 2);
  detach();
});
