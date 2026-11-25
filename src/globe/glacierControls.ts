import type { Controls } from "./controls";
import { projectionMoving } from "./morph";

const surfacePicks = new WeakMap<HTMLElement, Controls["pick"]>();

export function pickGlacierPoint(handle: HTMLElement, x: number, y: number) {
  const world = handle.closest<HTMLElement>("[data-glacier-world]");
  return world ? surfacePicks.get(world)?.(x, y) : undefined;
}

export function positionGlacierControls(root: Element, canvas: HTMLCanvasElement, controls: Controls) {
  const world = root.querySelector<HTMLElement>("[data-glacier-world]");
  if (!world) return;
  surfacePicks.set(world, controls.pick);
  const divider = world.querySelector<HTMLElement>("[data-glacier-divider]");
  const pin = world.querySelector<HTMLElement>("[data-glacier-pin]");
  if (!divider || !pin) return;

  const stage = world.getBoundingClientRect();
  const canvasBounds = canvas.getBoundingClientRect();
  const { west, south, east, north } = world.dataset;
  const start = Number(west);
  const end = Number(east);
  const high = Number(north);
  const latitude = high - (high - Number(south)) * (stage.height < 210 ? 0.39 : 0.12);
  const fraction = Number(divider.dataset["fraction"]);
  const split = start + (end - start) * fraction;
  const project = (lon: number, lat = latitude, radius = 1) =>
    controls.project(lon, lat, radius, canvasBounds);
  const moving = projectionMoving(controls.morph());
  world.toggleAttribute("data-glacier-moving", moving);

  function place(element: HTMLElement, point: ReturnType<typeof project>, margin: number, hold = false) {
    if (hold && !point) {
      element.removeAttribute("data-positioned");
      return;
    }
    const visible =
      point &&
      point.x >= stage.left + margin &&
      point.x <= stage.right - margin &&
      point.y >= stage.top + 23 &&
      point.y <= stage.bottom - 23;
    element.toggleAttribute("data-positioned", Boolean(visible || hold));
    if (!point || (!visible && !hold)) return;
    const x = Math.max(margin, Math.min(stage.width - margin, point.x - stage.left));
    const y = Math.max(25, Math.min(stage.height - 25, point.y - stage.top));
    element.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  }

  const point = project(Number(pin.dataset["lon"]), Number(pin.dataset["lat"]), 1.001);
  pin.toggleAttribute("data-label-left", !!point && point.x + 64 > stage.right);
  place(pin, point, 24);
  place(divider, project(split), 24, true);
  for (const label of world.querySelectorAll<HTMLElement>("[data-glacier-year]")) {
    const early = label.dataset["glacierYear"] === "2013";
    const enoughRoom = early ? fraction > 0.2 : fraction < 0.8;
    const center = early ? (start + split) / 2 : (split + end) / 2;
    place(label, enoughRoom ? project(center) : null, 20);
  }
}
