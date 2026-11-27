import { depthRecords } from "../data/depthRecords";
import {
  FIJI_SECTION_BASE_KM as BASE,
  FIJI_SECTION_KM as WIDTH,
  projectFijiSection,
  fijiSectionFloor,
} from "../geo/fijiSection";

type Point = { x: number; y: number };
const heldEvents = depthRecords.slice(0, 2).map(({ lon, lat, depthKm }) => ({
  x: projectFijiSection(lon, lat).alongKm,
  z: depthKm,
}));

function elements(svg: SVGSVGElement) {
  return {
    face: svg.querySelector<SVGGElement>("[data-section-face]")!,
    top: svg.querySelector<SVGPathElement>("[data-section-top]")!,
    wall: svg.querySelector<SVGPathElement>("[data-section-wall]")!,
    stations: svg.querySelector<SVGPathElement>("[data-section-top-stations]")!,
    line: svg.querySelector<SVGGElement>("[data-section-line]")!,
    type: svg.querySelector<SVGGElement>("[data-section-type]")!,
    island: svg.querySelector<SVGGElement>("[data-section-island]")!,
    distance: svg.querySelector<SVGTextElement>("[data-section-distance]")!,
    grid: Array.from(svg.querySelectorAll<SVGTextElement>("[data-grid-km]")),
    ratio: svg.parentElement!.querySelector<HTMLElement>("[data-section-ratio]"),
    buttons: Array.from(svg.parentElement!.querySelectorAll<HTMLButtonElement>("[data-section-hit]")),
    events: Array.from(svg.querySelectorAll<SVGGElement>("[data-fiji-event]")),
    previous: "",
  };
}
const cached = new WeakMap<SVGSVGElement, ReturnType<typeof elements>>();
const tr = (e: SVGElement, x: number, y: number) =>
  e.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);

export function positionFijiSection(
  svg: SVGSVGElement,
  west: Point | null,
  east: Point | null,
  island: Point | null,
  northWest: Point | null = null,
  northEast: Point | null = null,
) {
  const parts = cached.get(svg) ?? elements(svg);
  cached.set(svg, parts);
  if (!west || !east) {
    svg.removeAttribute("data-projected");
    parts.previous = "";
    return;
  }
  const rect = svg.getBoundingClientRect();
  const depth = Number(svg.dataset.depth ?? 0);
  const x = west.x - rect.left;
  const y = west.y - rect.top;
  const dx = east.x - west.x;
  const dy = east.y - west.y;
  if (dx < 2 || dx > rect.width * 1.6) {
    svg.removeAttribute("data-projected");
    parts.previous = "";
    return;
  }
  const key = [
    x,
    y,
    dx,
    dy,
    rect.width,
    rect.height,
    depth,
    island?.x ?? 0,
    island?.y ?? 0,
    northWest?.x ?? 0,
    northWest?.y ?? 0,
    northEast?.x ?? 0,
    northEast?.y ?? 0,
  ]
    .map((v) => v.toFixed(2))
    .join(",");
  if (key === parts.previous) return;
  parts.previous = key;
  svg.setAttribute("data-projected", "");
  const a = dx / WIDTH;
  const b = dy / WIDTH;
  const span = Math.hypot(dx, dy);
  const s = span / WIDTH;
  const phone = rect.width < 700 && rect.height > rect.width;
  const room =
    rect.height - (phone ? Math.max(192, Math.min(208, rect.height * 0.29)) : 48) - Math.max(y, y + dy);
  const scale = Math.max(0, Math.min(s, room / BASE));
  const u = Math.min(1, depth / 200);
  const open = Math.sin((u * Math.PI) / 2);
  const d = scale * open;
  const c = 0.09 * d * (1 - open);
  if (parts.ratio) {
    const ratio = depth > 0 ? `${(Math.hypot(c, d) / s).toFixed(2)}× horizontal` : "section closed";
    if (parts.ratio.textContent !== ratio) parts.ratio.textContent = ratio;
  }
  const floor = fijiSectionFloor(depth);
  const projected = (xx: number, yy: number) => `${xx.toFixed(2)} ${yy.toFixed(2)}`;
  if (northWest && northEast) {
    const nwx = northWest.x - rect.left,
      nwy = northWest.y - rect.top;
    const nex = northEast.x - rect.left,
      ney = northEast.y - rect.top;
    const sw = projected(x, y),
      se = projected(x + dx, y + dy);
    const nw = projected(nwx, nwy),
      ne = projected(nex, ney);
    const dropX = c * floor,
      dropY = d * floor;
    parts.top.setAttribute("d", `M${sw}L${se}L${ne}L${nw}Z`);
    const westWall = `M${nw}L${sw}l${projected(dropX, dropY)}L${projected(nwx + dropX, nwy + dropY)}Z`;
    const eastWall = `M${ne}L${se}l${projected(dropX, dropY)}L${projected(nex + dropX, ney + dropY)}Z`;
    parts.wall.setAttribute("d", westWall + eastWall);
    parts.stations.setAttribute(
      "d",
      heldEvents
        .map(({ x: km }) => {
          const u = km / WIDTH;
          return `M${projected(x + dx * u, y + dy * u)}L${projected(nwx + (nex - nwx) * u, nwy + (ney - nwy) * u)}`;
        })
        .join(""),
    );
  } else {
    for (const el of [parts.top, parts.stations, parts.wall]) el.removeAttribute("d");
  }
  parts.face.setAttribute("transform", `matrix(${a} ${b} ${c} ${d} ${x} ${y})`);
  parts.face.style.opacity = String(Math.min(1, depth / 16));
  parts.line.setAttribute("transform", `matrix(${a} ${b} 0 1 ${x} ${y})`);
  parts.type.style.opacity = String(Math.max(0, Math.min(1, (open * span - 75) / 90)));
  const place = (node: SVGElement, km: number, z: number) => tr(node, x + a * km + c * z, y + b * km + d * z);
  for (const tick of parts.grid) {
    const z = Number(tick.dataset.gridKm);
    place(tick, 0, z);
    tick.style.opacity = String(Math.max(0, Math.min(1, (floor - z) / 25)));
  }
  place(parts.distance, WIDTH, floor);
  parts.distance.setAttribute("dy", "15");
  parts.events.forEach((node, i) => {
    const { x: km, z } = heldEvents[i];
    place(node, km, z);
    const button = parts.buttons[i];
    if (button)
      button.style.transform = `translate(${(x + a * km + c * z - 22).toFixed(2)}px,${(y + b * km + d * z - 22).toFixed(2)}px)`;
    node.style.opacity = String(Math.max(0, Math.min(1, (floor - heldEvents[i].z) / 32)));
  });
  if (island) {
    tr(parts.island, island.x - rect.left, island.y - rect.top);
    parts.island.style.visibility = span > 48 ? "visible" : "hidden";
  } else {
    parts.island.style.visibility = "hidden";
  }
}
