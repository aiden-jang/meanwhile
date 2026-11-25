import type { Controls } from "./controls";

type Fix = readonly [day: number, lon: number, lat: number];
type ProjectedFix = { day: number; x: number; y: number };
type Track = { fixes: readonly Fix[]; day: number; landmark?: number | undefined };
const GUIDE_DAYS = 28;

export const observationTracks = new WeakMap<SVGSVGElement, Track>();
export const projectedFixes = new WeakMap<SVGSVGElement, ProjectedFix[]>();

export function nearestFix(points: readonly ProjectedFix[], x: number, y: number, day: number) {
  let nearest = day;
  let closest = Infinity;
  for (const point of points) {
    const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (distance < closest || (distance === closest && Math.abs(point.day - day) < Math.abs(nearest - day))) {
      nearest = point.day;
      closest = distance;
    }
  }
  return nearest;
}

export function positionObservationTrack(root: Element, canvas: HTMLCanvasElement, controls: Controls) {
  const svg = root.querySelector<SVGSVGElement>("[data-observation-track]");
  if (!svg) return;
  const track = observationTracks.get(svg);
  const guide = svg.querySelector("[data-track-guide]");
  const diamond = svg.querySelector("[data-track-diamond]");
  const label = svg.parentElement?.querySelector<HTMLElement>("[data-track-landmark]");
  if (!track || !guide || !diamond || !label) return;
  const bounds = canvas.getBoundingClientRect();
  const { left, top, right, bottom, width } = svg.getBoundingClientRect();
  const points: ProjectedFix[] = [];
  let marker: ProjectedFix | undefined;
  let selected: ProjectedFix | undefined;
  let previous: ProjectedFix | undefined;
  let line = "";
  for (const [day, lon, lat] of track.fixes) {
    if (day > track.day + GUIDE_DAYS) break;
    const point = controls.project(lon, lat, 1.01, bounds);
    if (!point || point.x < left || point.x > right || point.y < top || point.y > bottom) {
      previous = undefined;
      continue;
    }
    const fix = { day, x: point.x - left, y: point.y - top };
    if (day === track.day) selected = fix;
    if (day === track.landmark) marker = fix;
    if (point.x > left + 22 && point.x < right - 22 && point.y > top + 24 && point.y < bottom - 24)
      points.push({ day, x: point.x, y: point.y });
    if (day >= track.day) {
      const joined = previous && day === previous.day + 1 && Math.abs(fix.x - previous.x) < width / 2;
      line += `${joined ? "L" : "M"}${fix.x.toFixed(1)} ${fix.y.toFixed(1)}`;
    }
    previous = day >= track.day ? fix : undefined;
  }
  projectedFixes.set(svg, points);
  if (guide.getAttribute("d") !== line) guide.setAttribute("d", line);
  const shape = marker && track.day !== marker.day ? `M${marker.x - 4} ${marker.y}l4 -4 4 4 -4 4Z` : "";
  if (diamond.getAttribute("d") !== shape) diamond.setAttribute("d", shape);
  label.hidden =
    !shape ||
    !marker ||
    (selected !== undefined && Math.hypot(marker.x - selected.x, marker.y - selected.y) < 92);
  if (!label.hidden && marker) {
    const x = Math.min(Math.max(8, marker.x + 10), width - 138);
    const y = marker.y > bottom - top - 82 ? marker.y - 25 : marker.y + 10;
    label.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}
