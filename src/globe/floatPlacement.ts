import type { createFloatSurface } from "./floatSurface";

export function updateFloatTether(marker = document.querySelector<HTMLElement>("[data-float-instrument]")) {
  if (!marker) return;
  const layer = marker.parentElement!;
  const svg = layer.querySelector<SVGSVGElement>(".float-tether");
  if (!svg) return;
  const host = layer.getBoundingClientRect();
  const circle = marker.closest(".zones")?.querySelector<SVGCircleElement>(".float-profile-sample");
  const point = circle?.getBoundingClientRect();
  const profile = circle?.closest(".float-profile")?.getBoundingClientRect();
  const px = Number.parseFloat(marker.style.left) || 0;
  const py = Number.parseFloat(marker.style.top) || 0;
  svg.style.opacity =
    marker.style.opacity === "1" &&
    point?.width &&
    profile &&
    point.top >= profile.top &&
    point.bottom <= profile.bottom
      ? "1"
      : "0";
  const tx = (point?.left ?? 0) + (point?.width ?? 0) / 2 - host.left;
  const ty = (point?.top ?? 0) + (point?.height ?? 0) / 2 - host.top;
  svg.setAttribute("viewBox", `0 0 ${host.width} ${host.height}`);
  svg.querySelector("path")?.setAttribute("d", `M${px},${py} C${px + 40},${py} ${tx - 40},${ty} ${tx},${ty}`);
}

export function placeFloatReading(
  canvas: HTMLCanvasElement,
  point: ReturnType<ReturnType<typeof createFloatSurface>["size"]>,
  visible: boolean,
) {
  const marker = canvas.closest(".zones")?.querySelector<HTMLElement>("[data-float-instrument]");
  if (!marker) return;
  const layer = marker.parentElement!;
  const box = canvas.getBoundingClientRect();
  const host = layer.getBoundingClientRect();
  const x = (fraction: number) => box.left - host.left + fraction * box.width;
  const y = (fraction: number) => box.bottom - host.top - fraction * box.height;
  marker.style.left = `${x(point.x)}px`;
  marker.style.top = `${y(point.y)}px`;
  marker.style.opacity = visible ? "1" : "0";
  marker.style.visibility = visible ? "visible" : "hidden";
  const track = layer.querySelector<HTMLElement>("[data-float-depth-track]");
  if (track) {
    const top = `${y(point.shallow)}px`;
    const height = `${(point.shallow - point.deep) * box.height}px`;
    const left = `${x(point.left)}px`;
    const width = `${(point.right - point.left) * box.width}px`;
    if (track.style.top !== top) track.style.top = top;
    if (track.style.height !== height) track.style.height = height;
    if (track.style.left !== left) track.style.left = left;
    if (track.style.width !== width) track.style.width = width;
    track.toggleAttribute("data-ready", visible);
  }
  updateFloatTether(marker);
}
