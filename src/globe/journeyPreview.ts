import { DEG, toVec3 } from "../geo/sphere";
import type { Controls } from "./controlsTypes";

type Position = { lon: number; lat: number };

function geography(a: Position, b: Position): Position[] {
  const p = toVec3(a.lon, a.lat, 1);
  const q = toVec3(b.lon, b.lat, 1);
  const arc = Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])));
  if (arc < 0.0001) return [a, b];
  const segments = Math.max(8, Math.ceil(arc / (2 * DEG)));
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const before = Math.sin((1 - t) * arc),
      after = Math.sin(t * arc);
    const [x, y, z] = p.map((v, axis) => v * before + q[axis]! * after) as [number, number, number];
    return { lon: Math.atan2(x, z) / DEG, lat: Math.atan2(y, Math.hypot(x, z)) / DEG };
  });
}

const routes = new WeakMap<
  SVGSVGElement,
  {
    path: SVGPathElement;
    legs: Position[][];
    stops: { point: Position; spot: SVGGElement; disc: SVGGElement; leader: SVGLineElement }[];
  }
>();

export function positionJourneyPreview(root: Element | null, canvas: HTMLCanvasElement, controls: Controls) {
  const svg = root?.querySelector<SVGSVGElement>("svg[data-journey-route]");
  if (!svg) return;
  let route = routes.get(svg);
  if (!route) {
    const points = svg.dataset["journeyRoute"]!.split(";").map((point) => {
      const [lon, lat] = point.split(",").map(Number);
      return { lon: lon!, lat: lat! };
    });
    route = {
      path: svg.querySelector("path")!,
      legs: points.slice(1).map((point, index) => geography(points[index]!, point)),
      stops: Array.from(svg.querySelectorAll<SVGGElement>(":scope > g"), (spot, index) => ({
        spot,
        point: points[index]!,
        leader: spot.querySelector("line")!,
        disc: spot.querySelector("g")!,
      })),
    };
    routes.set(svg, route);
  }
  const box = svg.getBoundingClientRect();
  const viewport = canvas.getBoundingClientRect();
  let shape = "";
  for (const samples of route.legs) {
    let previous: { x: number; y: number } | null = null;
    for (const { lon, lat } of samples) {
      const point = controls.project(lon, lat, 1.007, viewport);
      if (point) {
        const joined = previous && Math.abs(point.x - previous.x) < box.width * 0.45;
        shape += `${joined ? "L" : "M"}${(point.x - box.left).toFixed(1)} ${(point.y - box.top).toFixed(1)}`;
      }
      previous = point;
    }
  }
  if (route.path.getAttribute("d") !== shape) route.path.setAttribute("d", shape);
  const occupied: { x: number; y: number }[] = [];
  for (const { point, spot, disc, leader } of route.stops) {
    const position = controls.project(point.lon, point.lat, 1.01, viewport);
    spot.style.visibility = position ? "visible" : "hidden";
    if (!position) continue;
    const { x, y } = position;
    const neighbor = occupied.find((next) => Math.hypot(next.x - x, next.y - y) < 25);
    const spread = neighbor ? (x < neighbor.x ? -1 : 1) * (25 - Math.abs(x - neighbor.x)) : 0;
    occupied.push({ x: x + spread, y });
    spot.setAttribute("transform", `translate(${x - box.left} ${y - box.top})`);
    disc.setAttribute("transform", `translate(${spread} 0)`);
    leader.setAttribute("x2", String(spread));
  }
}
