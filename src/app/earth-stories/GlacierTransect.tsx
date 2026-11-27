import { useMemo } from "react";
import { glacierPoint, type GlacierReadings } from "./glacierReadings";
import { GroundTransect } from "./survey/GroundTransect";

// One fixed cross-year survey along the central fast ice. Both mosaics use the same cells.
function centreline(grid: GlacierReadings) {
  const cells: number[] = [];
  const colAt = (lon: number) =>
    Math.round(((lon - grid.bounds[0]) / (grid.bounds[2] - grid.bounds[0])) * (grid.columns - 1));
  const rowAt = (lat: number) =>
    Math.round(((grid.bounds[3] - lat) / (grid.bounds[3] - grid.bounds[1])) * (grid.rows - 1));
  for (let c = colAt(-49.04); c >= colAt(-49.83); c--) {
    let cell = rowAt(69.16) * grid.columns + c;
    for (let r = rowAt(69.24); r <= rowAt(69.09); r++) {
      const k = r * grid.columns + c;
      if (grid.samples["2013"][k]! > grid.samples["2013"][cell]!) cell = k;
    }
    cells.push(cell);
  }
  return cells;
}
const number = new Intl.NumberFormat("en-US");
export function GlacierTransect({
  grid,
  sample,
  divider,
  select,
  showYear,
}: {
  grid: GlacierReadings;
  sample: number;
  divider: number;
  showYear: (year: "2013" | "2024") => void;
  select: (i: number) => void;
}) {
  const cells = useMemo(() => centreline(grid), [grid]);
  const points = useMemo(() => cells.map((i) => glacierPoint(grid, i)), [grid, cells]);
  const point = glacierPoint(grid, sample);
  const nearest = points.reduce(
    (best, p, i) => {
      const d = ((p.lon - point.lon) * 0.36) ** 2 + (p.lat - point.lat) ** 2;
      return d < best.d ? { i, d } : best;
    },
    { i: 0, d: Infinity },
  ).i;
  const frac = (point.lon - grid.bounds[0]) / (grid.bounds[2] - grid.bounds[0]);
  const year = divider === 100 || (divider > 0 && frac <= divider / 100) ? "2013" : "2024";
  const speed = grid.samples[year][sample];
  return (
    <GroundTransect
      kind="ice"
      points={points}
      index={nearest}
      sample={point}
      label="Annual ice speed"
      periods={{ year, select: showYear }}
      value={speed === undefined || speed < 0 ? "No reading" : number.format(speed) + " m/year"}
      ends={["Inland ice", "Toward fjord"]}
      select={(i) => select(cells[i]!)}
    />
  );
}
