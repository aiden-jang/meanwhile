import type { Vector3 } from "three";
import type { Controls } from "./controlsTypes";
import { projectionMoving } from "./morph";

type Coordinates = { lon: number; lat: number };
export type SurveyLens = { point: Coordinates };
export const SURVEY_RASTER_RADIUS = 1.009;
const pickers = new WeakMap<HTMLElement, Controls["pick"]>();

export function surveyLensPick(handle: HTMLElement, x: number, y: number) {
  return pickers.get(handle)?.(x, y);
}

export function positionSurveyLens(
  lens: SurveyLens | undefined,
  canvas: HTMLCanvasElement,
  controls: Controls,
  aperture: Vector3,
) {
  if (!lens) {
    aperture.z = -1;
    return;
  }
  const bounds = canvas.getBoundingClientRect();
  const handle = canvas.closest(".zones")?.querySelector<HTMLElement>("[data-survey-lens]");
  const point = controls.project(lens.point.lon, lens.point.lat, SURVEY_RASTER_RADIUS, bounds);
  const stage = handle?.parentElement?.getBoundingClientRect();
  const radius = bounds.width <= 360 && bounds.height <= 260 ? 30 : bounds.width < 650 ? 46 : 98;
  const visible =
    point &&
    stage &&
    point.x > stage.left &&
    point.x < stage.right &&
    point.y > stage.top &&
    point.y < stage.bottom;
  const ratio = bounds.width ? canvas.width / bounds.width : 1;
  aperture.set(
    point ? (point.x - bounds.left) * ratio : 0,
    point && bounds.height ? ((bounds.bottom - point.y) * canvas.height) / bounds.height : 0,
    visible ? radius * ratio : 0,
  );
  if (!handle) return;
  handle.toggleAttribute("data-positioned", !!visible);
  if (!visible || projectionMoving(controls.morph())) pickers.delete(handle);
  else pickers.set(handle, controls.pick);
  if (stage && point && visible) {
    const translate = (point.x - stage.left).toFixed(2) + "px " + (point.y - stage.top).toFixed(2) + "px";
    const size = radius * 2 + "px";
    if (handle.style.translate !== translate) handle.style.translate = translate;
    if (handle.style.getPropertyValue("--survey-lens-size") !== size)
      handle.style.setProperty("--survey-lens-size", size);
  }
}
