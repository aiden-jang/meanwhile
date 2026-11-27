import { describe, expect, it } from "vitest";
import { pickFace, type Row } from "./surface";
import { curtainSample } from "./CurtainRows";

const row = (x: number, along: number): Row => ({ base: { x, y: 0 }, tip: { x: x + 15, y: 60 }, along });

describe("picking a projected section", () => {
  it("reads the same sample along an inclined sheet", () => {
    const face = [[row(20, 0), row(100, 1)]];
    expect(pickFace(face, { x: 67.5, y: 30 })).toMatchObject({ along: 0.5, height: 0.5 });
    expect(pickFace(face, { x: 115, y: 80 })).toMatchObject({ along: 1, height: 1 });
  });
  it("clamps to the edge of a visible strip across the map seam", () => {
    const strips = [
      [row(0, 0), row(20, 0.2)],
      [row(200, 0.8), row(240, 1)],
    ];
    expect(pickFace(strips, { x: 65, y: 45 })?.along).toBe(0.2);
    expect(pickFace([], { x: 1, y: 1 })).toBeUndefined();
  });

  it("places the held lidar sample only on its own visible segment", () => {
    const strips = [
      [row(10, 0), row(20, 0.25)],
      [row(200, 0.75), row(240, 1)],
    ];
    expect(curtainSample(strips, 0.5)).toBeNull();
    expect(curtainSample(strips, 0.875)).toEqual({ foot: { x: 220, y: 0 }, tip: { x: 235, y: 60 } });
    expect(curtainSample(strips.slice(1), 0.75)?.foot).toEqual({ x: 200, y: 0 });
  });
});
