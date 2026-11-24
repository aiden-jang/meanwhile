import type { GlobeProps } from "./GlobeProps";
import type { Controls } from "./controls";

export function placeSurveyHandle(
  canvas: HTMLCanvasElement,
  controls: Controls,
  presentation: GlobeProps["globePresentation"],
  box: DOMRect,
) {
  if (
    !presentation ||
    typeof presentation !== "object" ||
    !("kind" in presentation) ||
    presentation.kind !== "observation"
  )
    return;
  const { surveyHandle, frame } = presentation;
  const corners = frame.raster?.corners;
  if (!surveyHandle || !corners) return;
  const handle = canvas.closest(".zones")?.querySelector<HTMLElement>("[data-survey-handle]");
  if (!handle) return;
  const stage = handle.parentElement!.getBoundingClientRect();
  const { before, after, fraction, latitude } = surveyHandle;
  const [sw, se, nw, ne] = corners;
  function project(u: number) {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    return controls.project(
      lerp(lerp(sw.lon, se.lon, u), lerp(nw.lon, ne.lon, u), latitude),
      lerp(lerp(sw.lat, se.lat, u), lerp(nw.lat, ne.lat, u), latitude),
      1.009,
      box,
    );
  }
  const start = project(before);
  const end = project(after);
  const point = project(before + (after - before) * fraction);
  const visible = !!(
    start &&
    end &&
    point &&
    Math.abs(end.x - start.x) >= 12 &&
    point.x >= stage.left + 12 &&
    point.x <= stage.right - 12 &&
    point.y >= stage.top + 24 &&
    point.y <= stage.bottom - 24
  );
  handle.toggleAttribute("data-positioned", visible);
  if (!visible || !point || !start || !end) return;
  handle.style.translate = `${point.x - stage.left}px ${point.y - stage.top}px`;
  handle.dataset["start"] = String(start.x);
  handle.dataset["end"] = String(end.x);
}
