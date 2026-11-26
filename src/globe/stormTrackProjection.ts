import type { Controls } from "./controls";
import { projectionMoving } from "./morph";

type Pixel = { x: number; y: number };
type Position = { lon: number; lat: number };
const tracks = new WeakMap<HTMLElement, readonly Position[]>();
const projections = new WeakMap<HTMLElement, readonly (Pixel | null)[]>();

export function registerStormTrack(world: HTMLElement, track: readonly Position[]) {
  tracks.set(world, track);
  return () => {
    tracks.delete(world);
    projections.delete(world);
  };
}

export function stormPositionAt(world: HTMLElement, x: number, y: number) {
  const points = projections.get(world);
  if (!points) return;
  let best: { position: number; distance: number } | undefined;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const distance = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
    if (!best || distance < best.distance) best = { position: i - 1 + t, distance };
  }
  return best;
}

export function positionStormTrack(root: Element, canvas: HTMLCanvasElement, controls: Controls) {
  const world = root.querySelector<HTMLElement>("[data-storm-track]");
  if (!world) return;
  const track = tracks.get(world);
  if (!track) return;
  const bounds = canvas.getBoundingClientRect();
  const stage = world.getBoundingClientRect();
  const points = track.map(({ lon, lat }) => controls.project(lon, lat, 1.012, bounds));
  const moving = projectionMoving(controls.morph());
  if (moving) projections.delete(world);
  else projections.set(world, points);
  world.toggleAttribute("data-storm-morphing", moving);

  const handle = world.querySelector<HTMLElement>("[data-storm-handle]");
  const trail = world.querySelector("[data-storm-trail]");
  if (handle && trail) {
    const position = Number(handle.dataset["dragPosition"] ?? handle.dataset["position"]);
    const index = Math.floor(position);
    const a = points[index];
    const b = points[Math.min(index + 1, points.length - 1)];
    const t = position - index;
    const at = a && b ? { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } : a;
    place(handle, at, stage, 23);
    const path: string[] = [];
    for (const point of [...points.slice(0, index + 1), at]) {
      if (!point) path.length = 0;
      else path.push(`${(point.x - stage.left).toFixed(1)},${(point.y - stage.top).toFixed(1)}`);
    }
    const next = path.join(" ");
    if (trail.getAttribute("points") !== next) trail.setAttribute("points", next);
  }
  for (const label of world.querySelectorAll<HTMLElement>("[data-storm-reference]")) {
    const point = points[Number(label.dataset["stormReference"])];
    place(label, point, stage, 10);
    label.toggleAttribute("data-label-left", !!point && point.x + 106 > stage.right);
  }
}

function place(element: HTMLElement, point: Pixel | null | undefined, stage: DOMRect, inset: number) {
  const visible =
    point &&
    point.x >= stage.left + inset &&
    point.x <= stage.right - inset &&
    point.y >= stage.top + inset &&
    point.y <= stage.bottom - inset;
  element.toggleAttribute("data-positioned", !!visible);
  if (visible) {
    const position = `${(point.x - stage.left).toFixed(2)}px ${(point.y - stage.top).toFixed(2)}px`;
    if (element.style.translate !== position) element.style.translate = position;
  }
}
