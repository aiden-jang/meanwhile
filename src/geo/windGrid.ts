export interface WindGrid {
  columns: number;
  rows: number;
  west: number;
  north: number;
  dx: number;
  dy: number;
  east: Float32Array;
  northward: Float32Array;
}

export function windAt(grid: WindGrid, lon: number, lat: number) {
  const x = ((((lon - grid.west) / grid.dx) % grid.columns) + grid.columns) % grid.columns;
  const y = (lat - grid.north) / grid.dy;
  if (y < 0 || y > grid.rows - 1) return null;
  const col = Math.floor(x),
    row = Math.floor(y);
  const next = (col + 1) % grid.columns,
    below = Math.min(row + 1, grid.rows - 1);
  const sx = x - col,
    sy = y - row;
  const interpolate = (v: Float32Array) => {
    const top = v[row * grid.columns + col]! * (1 - sx) + v[row * grid.columns + next]! * sx;
    const bottom = v[below * grid.columns + col]! * (1 - sx) + v[below * grid.columns + next]! * sx;
    return top * (1 - sy) + bottom * sy;
  };
  const east = interpolate(grid.east),
    north = interpolate(grid.northward);
  const speed = Math.hypot(east, north);
  if (!Number.isFinite(speed) || speed > 150) return null;
  return { east, north, speed };
}

const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export function windBearing(east: number, north: number) {
  return compass[(Math.round(Math.atan2(east, north) / (Math.PI / 4)) + 8) % 8]!;
}
