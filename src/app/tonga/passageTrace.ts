import { honolulu } from "./honolulu";
import { pressureAt } from "./tongaTimeline";
export const first = honolulu.start,
  last = first + honolulu.values.length - 1;
const samples = honolulu.values.map((_, i) => pressureAt(honolulu, first + i));
const measured = samples.filter((v): v is number => v !== null);
const lo = Math.min(...measured) - 0.16,
  hi = Math.max(...measured) + 0.16;

export function passageTrace(stage: HTMLElement) {
  const find = <T extends Element>(selector: string) => stage.querySelector<T>(selector)!;
  const screen = find<SVGSVGElement>(".passage-graph");
  const chart = find<SVGPathElement>(".passage-line");
  const bright = find<SVGPathElement>(".passage-measured");
  const cursor = find<SVGPathElement>(".passage-cursor");
  const dot = find<SVGCircleElement>(".passage-sample-dot");
  return (
    q: number,
    selected: number,
    station: { x: number; y: number } | null,
    bounds: DOMRect,
    trackBounds: DOMRect,
  ) => {
    // Unroll the measured line from Honolulu's projected location into the touch surface.
    screen.style.opacity = String(q);
    if (q > 0) {
      const w = trackBounds.width - 20,
        h = trackBounds.height - 12;
      const x0 = trackBounds.left - bounds.left + 10,
        y0 = trackBounds.top - bounds.top + 6;
      const sx = (station?.x ?? trackBounds.left) - bounds.left;
      const sy = (station?.y ?? trackBounds.top) - bounds.top;
      let d = "",
        lit = "",
        pen = false;
      for (let i = 0; i < samples.length; i++) {
        const p = samples[i];
        if (p == null) {
          pen = false;
          continue;
        }
        const u = i / (samples.length - 1);
        const x = sx + (x0 + u * w - sx) * q,
          y = sy + (y0 + ((hi - p) / (hi - lo)) * h - sy) * q;
        const segment = (pen ? "L" : "M") + x.toFixed(2) + "," + y.toFixed(2);
        d += segment;
        if (i <= selected - first) lit += segment;
        pen = true;
        if (i === selected - first) {
          dot.setAttribute("cx", String(x));
          dot.setAttribute("cy", String(y));
          cursor.setAttribute("d", "M" + x + " " + (y0 + 1) + "V" + (y0 + h));
        }
      }
      chart.setAttribute("d", d);
      bright.setAttribute("d", lit);
      cursor.style.opacity = q > 0.97 ? "1" : "0";
      dot.style.visibility = samples[selected - first] == null ? "hidden" : "visible";
    }
  };
}
