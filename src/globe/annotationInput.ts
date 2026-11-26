import { DEFAULT_CAMERA } from "./framing";
import type { Controls } from "./controls";

type AnnotationInput =
  | { lon: number; lat: number; zoom?: number }
  | { camera: "hold" | "freeze" | "resume" | "reset"; home?: { lon: number; lat: number; zoom: number } }
  | { curtainFold: () => void }
  | { revealReading: { lon: number; lat: number }; anchor: { lon: number; lat: number } };

function dispatchAnnotation(point?: AnnotationInput) {
  return (
    document
      .querySelector("#globe-view canvas")
      ?.dispatchEvent(new CustomEvent("scene-annotation", { detail: point, cancelable: true })) === false
  );
}

export function refreshAnnotations(point?: AnnotationInput) {
  dispatchAnnotation(point);
}

export const foldCurtainAnnotation = (complete: () => void) => dispatchAnnotation({ curtainFold: complete });

export function revealReadingInWorld(
  reading: { lon: number; lat: number },
  anchor: { lon: number; lat: number },
) {
  dispatchAnnotation({ revealReading: reading, anchor });
}

export function attachAnnotations(
  canvas: HTMLCanvasElement,
  controls: Controls,
  wake: () => void,
  foldCurtain?: (complete: () => void) => boolean,
) {
  const update = (event: Event) => {
    const point = (event as CustomEvent<AnnotationInput | undefined>).detail;
    if (point && "curtainFold" in point) {
      if (foldCurtain?.(point.curtainFold)) event.preventDefault();
    } else if (point && "camera" in point) {
      if (point.camera === "freeze") controls.setView(controls.state());
      else if (point.camera === "hold") controls.guidance.interrupt();
      else if (!controls.guidance.recenter() && point.camera === "reset") {
        const home = point.home ?? DEFAULT_CAMERA;
        controls.flyTo(home.lon, home.lat, home.zoom);
      }
    } else if (point && "revealReading" in point) {
      const { revealReading: reading, anchor } = point;
      const stage = canvas.getBoundingClientRect();
      const rail = document.getElementById("chrome-rail")?.getBoundingClientRect();
      const projected = controls.project(reading.lon, reading.lat, 1);
      const clear =
        projected &&
        projected.x > Math.max(stage.left, 0) + 18 &&
        projected.x < Math.min(stage.right, innerWidth) - 18 &&
        projected.y > Math.max(stage.top, 0) + 18 &&
        projected.y < Math.min(stage.bottom, innerHeight) - 18 &&
        !(
          rail?.width &&
          projected.x > rail.left - 18 &&
          projected.x < rail.right + 18 &&
          projected.y > rail.top - 18 &&
          projected.y < rail.bottom + 18
        );
      if (!clear) {
        const delta = ((reading.lon - anchor.lon + 540) % 360) - 180;
        controls.guidance.interrupt();
        controls.flyTo(
          anchor.lon + delta / 2,
          (anchor.lat + reading.lat) / 2,
          Math.min(controls.state().zoom, 1.95),
        );
      }
    } else if (point && Number.isFinite(point.lon) && Number.isFinite(point.lat)) {
      controls.guidance.interrupt();
      controls.flyTo(point.lon, point.lat, point.zoom ?? Math.max(1.4, Math.min(3, controls.state().zoom)));
    }
    wake();
  };
  canvas.addEventListener("scene-annotation", update);
  return () => canvas.removeEventListener("scene-annotation", update);
}
