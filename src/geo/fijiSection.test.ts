import { describe, expect, it } from "vitest";
import { depthRecords } from "../data/depthRecords";
import { distanceKm } from "./sphere";
import {
  FIJI_NORTH_EDGE,
  FIJI_TRANSECT,
  FIJI_SECTION_KM,
  fijiSectionFloor,
  projectFijiSection,
  sectionCatalogue,
} from "./fijiSection";
import { loadSlab } from "./slab";
import seafloor from "./fijiSeafloor.json";

describe("Fiji's earthquake transect", () => {
  const { west, east } = FIJI_TRANSECT;
  const [august, september] = depthRecords;
  it("runs 900 km across the date line through the two USGS event locations", () => {
    expect(west.lon).toBeGreaterThan(0);
    expect(east.lon).toBeLessThan(0);
    expect(projectFijiSection(west.lon, west.lat).alongKm).toBeCloseTo(0, 7);
    expect(projectFijiSection(east.lon, east.lat).alongKm).toBeCloseTo(FIJI_SECTION_KM, 7);
    const a = projectFijiSection(august.lon, august.lat);
    const s = projectFijiSection(september.lon, september.lat);
    expect(a.offsetKm).toBeCloseTo(0, 7);
    expect(s.offsetKm).toBeCloseTo(0, 7);
    expect(a.alongKm - s.alongKm).toBeCloseTo(
      distanceKm(august.lon, august.lat, september.lon, september.lat),
      7,
    );
  });

  it("places the visible north rim on the actual swath and opens the face with depth", () => {
    for (const [key, expected] of [
      ["west", 0],
      ["east", FIJI_SECTION_KM],
    ] as const) {
      const point = FIJI_NORTH_EDGE[key];
      const station = projectFijiSection(point.lon, point.lat);
      expect(station.alongKm).toBeCloseTo(expected, 6);
      expect(station.offsetKm).toBeCloseTo(100, 6);
    }
    expect(fijiSectionFloor(205)).toBeLessThan(342);
    expect(fijiSectionFloor(600)).toBeGreaterThan(600);
    expect(fijiSectionFloor(670.8)).toBe(720);
  });

  it("preserves each observed depth and excludes points across or beyond the section", () => {
    const paths = sectionCatalogue([
      [august.lon, august.lat, 600, 5],
      [august.lon, august.lat + 2, 566, 4.6],
      [east.lon + 2, east.lat, 550, 4.6],
      [september.lon, september.lat, 670.8, 7.9],
    ]);
    expect(paths[0]).toBe("");
    expect(paths[1]).toEqual(expect.stringMatching(/^M[\d.]+ 600h\.01$/));
    expect(paths[2]).toEqual(expect.stringMatching(/^M[\d.]+ 670\.8h\.01$/));
  });

  it("samples the entire surface trace at its declared interval", () => {
    expect((seafloor.elevationM.length - 1) * seafloor.intervalKm).toBe(FIJI_SECTION_KM);
    expect(Math.min(...seafloor.elevationM)).toBeLessThan(-3000);
    expect(Math.max(...seafloor.elevationM)).toBeGreaterThan(0);
  });

  it("includes the committed deep earthquake catalogue in the measured corridor", async () => {
    const paths = sectionCatalogue(await loadSlab());
    expect(paths.join("").split("M").length - 1).toBeGreaterThan(100);
  });
});
