import type { PerspectiveCamera } from "three";
import { visibleCopies } from "./morph";

function sceneBleed(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const landing = Number(style.getPropertyValue("--landing-sky-bleed"));
  const panel = parseFloat(style.getPropertyValue("--scene-left-bleed"));
  return panel || (landing * document.documentElement.clientWidth) / 100 || 0;
}

export function fitGlobeCamera(
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const bleed = Math.min(width - 1, sceneBleed(canvas));
  const scene = canvas.parentElement;
  const topBleed = scene
    ? Math.min(height - 1, Math.max(0, -parseFloat(getComputedStyle(scene).top) || 0))
    : 0;
  const framedHeight = height - topBleed;
  camera.aspect = width / framedHeight;
  camera.updateProjectionMatrix();
  // Zoom is relative to this fit, so resizing preserves the visitor's chosen framing.
  const halfFov = Math.tan((camera.fov * Math.PI) / 360);
  const byHeight = 1 / (0.86 * halfFov);
  const fit = byHeight / Math.min(1, (width - bleed) / framedHeight);
  return { fit, byHeight, bleed, topBleed, radiusPx: framedHeight / (2 * fit * halfFov) };
}

export function globeFramingRect(element: HTMLElement): DOMRect {
  const rect = element.getBoundingClientRect();
  const bleed = element.clientWidth ? (sceneBleed(element) * rect.width) / element.clientWidth : 0;
  return bleed ? new DOMRect(rect.x + bleed, rect.y, rect.width - bleed, rect.height) : rect;
}

export function visibleMapCopies(camera: PerspectiveCamera, period: number) {
  const matrix = camera.projectionMatrix.elements;
  const halfWidth = camera.position.z / matrix[0]!;
  // The left bleed moves the edge of the frustum without moving the camera position.
  return visibleCopies(camera.position.x + halfWidth * matrix[8]!, halfWidth, period);
}
