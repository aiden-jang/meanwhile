import { alohaReading, clamp, depthAtPressure, ease } from "./aloha";
import { east, north, oahu, sectionBase, south, stationAlong, transectMeters } from "./alohaTransect";
import { alohaStation } from "./pacificMoment";

type Point = { x: number; y: number };
export type Project = (p: { lon: number; lat: number }) => Point | null;
const xy = (p: Point) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
const place = (el: Element, p: Point) => el.setAttribute("transform", `translate(${xy(p)})`);

export function createPacificLayout(dialog: HTMLDialogElement) {
  const svg = dialog.querySelector<SVGSVGElement>(".pacific-section")!;
  const part = (name: string) => svg.querySelector<SVGElement>(`[data-${name}]`)!;
  const surround = part("surround"),
    deck = part("deck"),
    face = part("face"),
    side = part("side"),
    datum = part("datum");
  const station = part("station"),
    island = part("island"),
    clip = part("window");
  const cast = part("package"),
    cable = part("cable"),
    plot = part("cast-plot"),
    samples = part("samples");
  const thermometer = part("thermometer"),
    temperature = thermometer.querySelector("text")!;
  const tag = station.querySelector("text")!,
    traceWindow = part("trace-window");
  const ticks = Array.from(svg.querySelectorAll<SVGTextElement>("[data-meters]"));
  const scale = dialog.querySelector<HTMLElement>("[data-depth-scale]");
  let last = "";
  return (project: Project, width: number, height: number, position: number) => {
    const pin = project(alohaStation);
    const drawable = pin && pin.x > 0 && pin.y > 0 && pin.x < width && pin.y < height;
    if (!drawable) {
      svg.removeAttribute("data-located");
      last = "";
      return;
    }
    svg.setAttribute("data-located", "");
    const a = project(north),
      b = project(south);
    const na = project({ lon: east, lat: north.lat }),
      nb = project({ lon: east, lat: south.lat });
    const land = project(oahu);
    const p = position / 1000;
    const show = ease(0.245, 0.425, p);
    const left = Math.max(74, Math.min(width - 75, pin.x - 9));
    tag.setAttribute("x", String(left - pin.x));
    tag.setAttribute("y", pin.y < 105 ? "30" : "-33");
    place(station, pin);
    if (!a || !b || !na || !nb || !land || show === 0) {
      svg.removeAttribute("data-section");
      last = "";
      return;
    }
    const key = [position, width, height, ...[pin, a, b, na, nb, land].flatMap((v) => [v.x, v.y])]
      .map((v) => v.toFixed(2))
      .join(",");
    if (last === key) return;
    last = key;
    svg.setAttribute("data-section", "");
    const dx = (b.x - a.x) / 1000,
      dy = (b.y - a.y) / 1000;
    const start = { x: pin.x - stationAlong * dx, y: pin.y - stationAlong * dy };
    const end = { x: start.x + 1000 * dx, y: start.y + 1000 * dy };
    const polygon = `M${xy(start)}L${xy(na)}L${xy(nb)}L${xy(end)}Z`;
    surround.setAttribute("d", `M0 0H${width}V${height}H0Z${polygon}`);
    surround.style.opacity = String(show);
    deck.setAttribute("d", polygon);
    deck.style.opacity = String(show);
    datum.setAttribute("d", `M${xy(start)}L${xy(end)}`);
    datum.style.opacity = String(show);
    place(island, land);
    island.style.opacity = String(show);
    const phone = width < 680 && height > width;
    const bottom = height - (phone ? Math.min(251, height * 0.37) : height < 500 ? 134 : 144);
    const sy = Math.max(0, (bottom - Math.max(start.y, end.y)) / sectionBase);
    const { meters, reading } = alohaReading(position);
    const window = Math.min(sectionBase, 760 * ease(0.34, 0.59, p) + meters * 1.08);
    dialog.style.setProperty("--pacific-pin-y", `${pin.y.toFixed(2)}px`);
    face.setAttribute("transform", `matrix(${dx} ${dy} 0 ${sy} ${start.x} ${start.y})`);
    side.setAttribute(
      "transform",
      `matrix(${(nb.x - end.x) / 1000} ${(nb.y - end.y) / 1000} 0 ${sy} ${end.x} ${end.y})`,
    );
    clip.setAttribute("height", String(window));
    traceWindow.setAttribute("height", String(window));
    for (const tick of ticks) {
      const m = Number(tick.dataset.meters);
      place(tick, { x: Math.max(30, start.x - 7), y: start.y + m * sy });
      tick.style.opacity = String(clamp((window - m) / 200));
    }
    const held = ease(0.375, 0.465, p);
    const cy = pin.y + meters * sy;
    const castSize = phone ? 0.72 : 0.98;
    cast.setAttribute("transform", `translate(${pin.x} ${cy}) scale(${castSize})`);
    cast.style.opacity = String(held);
    cable.setAttribute("d", `M${xy(pin)}V${Math.max(pin.y, cy - 14 * castSize)}`);
    const tx = phone ? 1.37 : Math.min(3.15, width * 0.0025);
    const baseX = pin.x + (phone ? 25 : 40);
    const slope = Math.abs(dx) > 0.01 ? dy / dx : 0;
    const plotY = pin.y + (baseX - pin.x) * slope;
    plot.setAttribute("transform", `matrix(${tx} ${tx * slope} 0 ${sy} ${baseX} ${plotY})`);
    plot.style.opacity = String(held);
    samples.setAttribute("height", String(meters));
    place(thermometer, {
      x: baseX + reading[1] * tx,
      y: plotY + reading[1] * tx * slope + depthAtPressure(reading[0]) * sy,
    });
    thermometer.style.opacity = String(held);
    temperature.textContent = `${reading[1].toFixed(2)} °C`;
    if (scale)
      scale.textContent = `Depth enlarged ${Math.round((sy * transectMeters) / Math.max(1, 1000 * Math.hypot(dx, dy)))}×`;
  };
}
