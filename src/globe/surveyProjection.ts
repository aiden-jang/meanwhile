import { MathUtils, Matrix4, Vector3, type PerspectiveCamera } from "three";
import { DEG, EARTH_RADIUS_KM } from "../geo/sphere";
import type { ObservationView } from "../app/observations/types";
import type { Controls } from "./controls";
import { mapRepeatSpacing, unfoldPoint } from "./morph";

export type Pixel = { x: number; y: number };
type Curtain = NonNullable<ObservationView["curtain"]>;
export interface SurveyFrame {
  width: number;
  height: number;
  ground: (lon: number, lat: number, radius?: number) => Pixel | null;
  face: (lon: number, lat: number, height: number, along: number) => Pixel | null;
}
type Drawing = {
  svg: SVGSVGElement;
  draw: (frame: SurveyFrame) => void;
  fresh: () => boolean;
  view: Matrix4;
  lens: Matrix4;
  bounds: string;
};
const drawings = new WeakMap<Element, Drawing>();

export function registerSurvey(svg: SVGSVGElement, draw: Drawing["draw"], fresh: () => boolean) {
  const root = svg.closest(".zones");
  if (!root) return;
  const drawing = { svg, draw, fresh, view: new Matrix4(), lens: new Matrix4(), bounds: "" };
  drawings.set(root, drawing);
  return () => {
    if (drawings.get(root) === drawing) drawings.delete(root);
  };
}

const foot = new Vector3(),
  normal = new Vector3(),
  direction = new Vector3(),
  east = new Vector3();

export function projectSurvey(
  canvas: HTMLCanvasElement,
  camera: PerspectiveCamera,
  controls: Controls,
  curtain: Curtain | undefined,
  opened: number,
  folded: number,
) {
  const root = canvas.closest(".zones");
  const drawing = root && drawings.get(root);
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect(),
    view = drawing.svg.getBoundingClientRect();
  if (!view.width || !view.height) return;
  const t = controls.morph();
  const bounds = [
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    view.x,
    view.y,
    view.width,
    view.height,
    t,
    opened,
    folded,
  ].join(",");
  if (
    !drawing.fresh() &&
    drawing.bounds === bounds &&
    drawing.view.equals(camera.matrixWorldInverse) &&
    drawing.lens.equals(camera.projectionMatrix)
  )
    return;
  drawing.bounds = bounds;
  drawing.view.copy(camera.matrixWorldInverse);
  drawing.lens.copy(camera.projectionMatrix);
  function ground(lon: number, lat: number, radius = 1.013) {
    const p = controls.project(lon, lat, radius, rect);
    return p && { x: p.x - view.left, y: p.y - view.top };
  }
  // Follow the same foot, exaggeration, hinge and dated observation as the native curtain.
  function face(lon: number, lat: number, height: number, along: number) {
    if (!curtain || !ground(lon, lat)) return null;
    unfoldPoint(foot, lon, lat, t, 0.013 * (1 - 0.8 * t), normal);
    const period = mapRepeatSpacing(t);
    if (period) foot.x += Math.round((camera.position.x - foot.x) / period) * period;
    const crease = MathUtils.smoothstep(folded, along * 0.26, 0.74 + along * 0.26);
    const rise =
      ((height * curtain.heightKm * curtain.exaggeration) / EARTH_RADIUS_KM) * opened * (1 - crease);
    const lam = lon * DEG,
      phi = lat * DEG;
    if (curtain.down) {
      direction
        .set(
          Math.cos(phi) * Math.sin(lam) * 0.45,
          Math.sin(phi) * 0.45 - 1,
          Math.cos(phi) * Math.cos(lam) * 0.45,
        )
        .normalize();
    } else {
      direction
        .copy(normal)
        .addScaledVector(east.set(Math.cos(lam), 0, -Math.sin(lam)), 1.25)
        .normalize();
    }
    foot.addScaledVector(direction, rise * (1 - t));
    if (curtain.down) foot.y -= t * rise;
    else foot.x += t * rise;
    foot.z += t * rise * 0.2;
    foot.project(camera);
    return {
      x: rect.left - view.left + ((foot.x + 1) * rect.width) / 2,
      y: rect.top - view.top + ((1 - foot.y) * rect.height) / 2,
    };
  }
  drawing.draw({ width: view.width, height: view.height, ground, face });
}
