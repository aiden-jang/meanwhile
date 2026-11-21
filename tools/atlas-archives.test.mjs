import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const root = new URL("../src/sources/earth-atlas/", import.meta.url);
const archive = (name) => JSON.parse(readFileSync(new URL(`${name}.json`, root), "utf8"));
test("scientific archives and rasters retain usable data and provenance", () => {
  for (const name of [
    "apophis",
    "eclipse",
    "bloom",
    "spring",
    "seafloor",
    "glacier",
    "nino",
    "reef",
    "aral",
    "river",
  ]) {
    const source = archive(`${name}-sources`);
    assert.ok(Object.keys(source.sha256).length, name);
    assert.ok(Object.values(source.sha256).every((v) => /^[a-f0-9]{64}$/.test(v)));
  }
  for (const file of readdirSync(new URL("assets/", root)).filter((f) => f.endsWith(".webp"))) {
    assert.ok(existsSync(new URL(`assets/${file}.json`, root)), file);
    assert.match(
      JSON.parse(readFileSync(new URL(`assets/${file}.json`, root), "utf8")).prompt,
      /Sourced scientific raster:/,
    );
  }
  assert.ok(archive("reef").frames.some((f) => f.keys !== null && f.sst !== null));
});

test("glacier readings share the annual mosaics' coverage and provenance", () => {
  const grid = archive("glacier_readings");
  assert.deepEqual(grid.bounds, archive("glacier").bounds);
  const original = archive("glacier-sources").sha256;
  const samples = Object.entries(archive("glacier_readings-sources").sha256);
  assert.equal(samples.length, 4);
  for (const [source, digest] of samples) assert.equal(digest, original[source]);
  for (const year of [2013, 2024]) {
    const cells = grid.samples[year];
    assert.equal(cells.length, grid.columns * grid.rows);
    assert.ok(cells.some((value) => value === -1));
    assert.ok(cells.some((value) => value > 10_000));
    assert.ok(cells.every((value) => Number.isInteger(value) && value >= -1));
  }
});
