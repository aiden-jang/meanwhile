import { attachAnnotations } from "./annotationInput";
import type { Controls } from "./controls";

export function observeViewport(
  canvas: HTMLCanvasElement,
  globe: { resize: () => void; controls: Controls; foldCurtain: (complete: () => void) => boolean },
  redraw: () => void,
  wake: () => void,
  sleep: () => void,
): () => void {
  const detachAnnotations = attachAnnotations(canvas, globe.controls, wake, globe.foldCurtain);
  const visibility = () => (document.hidden ? sleep() : wake());
  document.addEventListener("visibilitychange", visibility);
  const observer = new ResizeObserver(() => {
    globe.resize();
    redraw();
  });
  if (canvas.parentElement) observer.observe(canvas.parentElement);
  return () => {
    detachAnnotations();
    observer.disconnect();
    document.removeEventListener("visibilitychange", visibility);
  };
}
