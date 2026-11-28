import { hawaiiDistance, hawaiiPlaces } from "../app/discovery/hawaiiPlaces";
import type { Controls } from "./controlsTypes";

interface Mounted {
  group: HTMLElement;
  markers: { host: HTMLElement; button: HTMLButtonElement; line: SVGPathElement }[];
}
/** Handled after the globe's tap recognizer, so dragging from a dot still moves the camera. */
export function openHawaiiPin(canvas: HTMLCanvasElement, event: PointerEvent) {
  const pins = canvas.closest(".zones")?.querySelectorAll<HTMLElement>(".island-anchor:not([hidden])");
  if (!pins?.length) return false;
  let closest: HTMLElement | null = null;
  let reach = event.pointerType === "touch" ? 16 : 8;
  for (const pin of pins) {
    const { left, top } = pin.getBoundingClientRect();
    const distance = Math.hypot(event.clientX - left, event.clientY - top);
    if (distance < reach) {
      reach = distance;
      closest = pin;
    }
  }
  if (!closest) return false;
  event.preventDefault();
  closest.querySelector("button")?.click();
  return true;
}
export function createHawaiiDiscovery(canvas: HTMLCanvasElement, controls: Controls) {
  let mounted: Mounted | undefined;
  let movingUntil = 0;
  let primary = 0;
  let lastX = NaN,
    lastY = NaN;
  let settle: ReturnType<typeof setTimeout> | undefined;
  function reset() {
    if (settle !== undefined) clearTimeout(settle);
    settle = undefined;
    movingUntil = 0;
    primary = 0;
    lastX = lastY = NaN;
    if (mounted) {
      mounted.group.removeAttribute("data-moving");
      mounted.group.parentElement?.removeAttribute("data-hawaii");
      mounted.markers.forEach(({ host }) => {
        host.hidden = true;
      });
      mounted = undefined;
    }
  }
  function place() {
    const group = canvas.closest(".zones")?.querySelector<HTMLElement>(".hawaii-markers");
    const { lon, lat, zoom } = controls.state();
    if (!group || zoom < 1 || hawaiiDistance(lon, lat) > 31) {
      if (mounted) reset();
      return false;
    }
    if (mounted?.group !== group) {
      reset();
      mounted = {
        group,
        markers: Array.from(group.querySelectorAll<HTMLElement>(".island-anchor"), (host) => ({
          host,
          button: host.querySelector("button")!,
          line: host.querySelector("path")!,
        })),
      };
    }
    const area = group.getBoundingClientRect(),
      canvasArea = canvas.getBoundingClientRect();
    const narrow = innerWidth < 760;
    const rail = document.getElementById("chrome-rail");
    const railBox = rail && !rail.hidden ? rail.getBoundingClientRect() : null;
    const left = Math.max(area.left, 4, !narrow && railBox ? railBox.right + 8 : 0);
    const right = Math.min(innerWidth - 4, area.right);
    const top = Math.max(area.top, narrow ? 72 : 74);
    const bottom = Math.min(
      innerHeight - (narrow ? 75 : 43),
      area.bottom,
      narrow && railBox && railBox.top > 70 ? railBox.top - 8 : Infinity,
    );
    if (right - left < 215 || bottom - top < 108) {
      reset();
      return false;
    }
    let visible = false;
    const distances = hawaiiPlaces.map(({ point }) =>
      Math.hypot((((lon - point.lon + 540) % 360) - 180) * 0.934, lat - point.lat),
    );
    const alternate = 1 - primary;
    if (distances[alternate]! + 0.4 < distances[primary]!) primary = alternate;
    for (let i = 0; i < hawaiiPlaces.length; ++i) {
      const { point } = hawaiiPlaces[i]!;
      const { host, button, line } = mounted.markers[i]!;
      const pin = controls.project(point.lon, point.lat, 1.003, canvasArea);
      const show = !!pin && pin.x > left + 8 && pin.x < right - 8 && pin.y > top + 10 && pin.y < bottom - 10;
      host.hidden = !show;
      if (!show || !pin) continue;
      visible = true;
      host.toggleAttribute("data-nearest", i === primary);
      const x = pin.x - area.left,
        y = pin.y - area.top;
      const width = button.offsetWidth,
        height = button.offsetHeight;
      const reach = narrow ? 22 : 39;
      // The two leaders exit on opposite diagonals even at small scale on the flat map.
      const bx = Math.max(left, Math.min(right - width, pin.x + (i === 0 ? reach : -reach - width))) - pin.x;
      const by = Math.max(top, Math.min(bottom - height, pin.y + (i === 0 ? 13 : -height - 15))) - pin.y;
      host.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      button.style.transform = `translate(${bx.toFixed(2)}px,${by.toFixed(2)}px)`;
      const end = i === 0 ? bx : bx + width;
      const ey = by + height / 2;
      const bend = end - Math.sign(end) * Math.min(9, Math.abs(end) * 0.3);
      line.setAttribute("d", `M0,0 L${bend.toFixed(1)},${ey.toFixed(1)} H${end.toFixed(1)}`);
      if (i === 0) {
        if (Math.hypot(x - lastX, y - lastY) > 0.65) {
          group.setAttribute("data-moving", "");
          movingUntil = performance.now() + 180;
          if (settle === undefined) {
            const finish = () => {
              const wait = movingUntil - performance.now();
              if (wait > 0) settle = setTimeout(finish, wait);
              else {
                group.removeAttribute("data-moving");
                settle = undefined;
              }
            };
            settle = setTimeout(finish, 185);
          }
        }
        lastX = x;
        lastY = y;
      }
    }
    group.parentElement?.toggleAttribute("data-hawaii", visible);
    return visible;
  }
  return { place, dispose: reset };
}
