import { useLayoutEffect, useRef, type PointerEvent } from "react";
import { registerSurvey, type Pixel, type SurveyFrame } from "../../../globe/surveyProjection";
import { refreshAnnotations } from "../../../globe/annotationInput";

export type Row = { base: Pixel; tip: Pixel; along: number };
export const clamp = (value: number, max = 1) => Math.min(max, Math.max(0, value));
export const mix = (a: Pixel, b: Pixel, t: number): Pixel => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export const xy = (p: Pixel) => p.x.toFixed(1) + "," + p.y.toFixed(1);
export const path = (points: Pixel[]) => (points.length ? "M" + points.map(xy).join("L") : "");
export const facePath = (rows: Row[]) =>
  rows.length ? path([...rows.map((r) => r.base), ...rows.map((r) => r.tip).reverse()]) + "Z" : "";

export function attr(el: Element | null, name: string, value: string) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function place(el: Element | null, point: Pixel | null) {
  if (!el) return;
  el.toggleAttribute("data-off", !point);
  if (point) attr(el, "transform", "translate(" + xy(point) + ")");
}

// Invert each projected quadrilateral as two triangles, including perspective-skewed faces.
export function pickFace(strips: Row[][], p: Pixel) {
  let closest: { along: number; height: number; distance: number } | undefined;
  for (const strip of strips) {
    for (let i = 1; i < strip.length; i++) {
      const l = strip[i - 1]!,
        r = strip[i]!;
      const corners = [
        [l.base, l.along, 0],
        [r.base, r.along, 0],
        [r.tip, r.along, 1],
        [l.tip, l.along, 1],
      ] as const;
      for (const [a, b, c] of [
        [corners[0], corners[1], corners[2]],
        [corners[0], corners[2], corners[3]],
      ] as const) {
        const vx = b[0].x - a[0].x,
          vy = b[0].y - a[0].y,
          wx = c[0].x - a[0].x,
          wy = c[0].y - a[0].y;
        const dx = p.x - a[0].x,
          dy = p.y - a[0].y,
          det = vx * wy - vy * wx;
        if (Math.abs(det) > 0.001) {
          const u = (dx * wy - dy * wx) / det,
            v = (vx * dy - vy * dx) / det;
          if (u >= 0 && v >= 0 && u + v <= 1)
            return {
              along: a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]),
              height: a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2]),
            };
        }
      }
      for (const [a, b] of [
        [corners[0], corners[1]],
        [corners[1], corners[2]],
        [corners[2], corners[3]],
        [corners[3], corners[0]],
      ] as const) {
        const dx = b[0].x - a[0].x,
          dy = b[0].y - a[0].y;
        const t = clamp(((p.x - a[0].x) * dx + (p.y - a[0].y) * dy) / (dx * dx + dy * dy || 1));
        const q = mix(a[0], b[0], t),
          distance = Math.hypot(q.x - p.x, q.y - p.y);
        if (!closest || distance < closest.distance)
          closest = { along: a[1] + (b[1] - a[1]) * t, height: a[2] + (b[2] - a[2]) * t, distance };
      }
    }
  }
  return closest;
}

export function useSurveySurface(
  draw: (svg: SVGSVGElement, frame: SurveyFrame) => Row[][],
  select: (along: number, height: number) => void,
  wheel?: (delta: number) => void,
) {
  const ref = useRef<SVGSVGElement>(null);
  const rows = useRef<Row[][]>([]);
  const dirty = useRef(true);
  const active = useRef({ draw, select, wheel });
  const pending = useRef<{ along: number; height: number }>();
  const request = useRef(0);
  useLayoutEffect(() => {
    active.current = { draw, select, wheel };
    dirty.current = true;
    refreshAnnotations();
  });
  useLayoutEffect(() => {
    const svg = ref.current!;
    const unregister = registerSurvey(
      svg,
      (frame) => {
        rows.current = active.current.draw(svg, frame);
      },
      () => {
        const wasDirty = dirty.current;
        dirty.current = false;
        return wasDirty;
      },
    );
    refreshAnnotations();
    function roll(e: WheelEvent) {
      if (!active.current.wheel || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;
      const box = svg.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)
        return;
      if (
        e.target instanceof Element &&
        e.target.closest("button,input,select,details,dialog,.story-dock,.replay-sidebar")
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      active.current.wheel(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? box.height : 1));
    }
    window.addEventListener("wheel", roll, { capture: true, passive: false });
    return () => {
      unregister?.();
      cancelAnimationFrame(request.current);
      window.removeEventListener("wheel", roll, true);
    };
  }, []);
  function flush() {
    cancelAnimationFrame(request.current);
    request.current = 0;
    if (pending.current) {
      active.current.select(pending.current.along, pending.current.height);
      pending.current = undefined;
    }
  }
  function read(e: PointerEvent<Element>) {
    const box = ref.current!.getBoundingClientRect();
    pending.current = pickFace(rows.current, { x: e.clientX - box.left, y: e.clientY - box.top });
    if (!request.current) request.current = requestAnimationFrame(flush);
  }
  return {
    ref,
    events: {
      onPointerDown(e: PointerEvent<Element>) {
        if (!e.isPrimary || e.button !== 0) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        read(e);
      },
      onPointerMove(e: PointerEvent<Element>) {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) read(e);
      },
      onPointerUp(e: PointerEvent<Element>) {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          read(e);
          flush();
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      },
      onPointerCancel() {
        flush();
      },
    },
  };
}
