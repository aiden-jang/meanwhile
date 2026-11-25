export type SkyPathPoint = { x: number; y: number; at: number };
export type SkyPath = readonly (SkyPathPoint | null)[];

export const projectedMoonPaths = new WeakMap<Element, SkyPath>();

export function pathLine(points: SkyPath): string {
  let path = "";
  let joined = false;
  for (const point of points) {
    if (point) path += `${joined ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
    joined = point !== null;
  }
  return path;
}

export function nearestSkyTime(path: SkyPath, x: number, y: number, width: number, height: number) {
  let time: number | undefined;
  let closest = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (!a || !b) continue;
    const dx = ((b.x - a.x) * width) / 100;
    const dy = ((b.y - a.y) * height) / 100;
    const px = x - (a.x * width) / 100;
    const py = y - (a.y * height) / 100;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) continue;
    const along = Math.min(1, Math.max(0, (px * dx + py * dy) / lengthSquared));
    const distance = (px - along * dx) ** 2 + (py - along * dy) ** 2;
    if (distance < closest) {
      closest = distance;
      time = a.at + along * (b.at - a.at);
    }
  }
  return time;
}
