import type { GeoPoint } from "../../observations/types";
import type { SurveyFrame } from "../../../globe/surveyProjection";
import { attr, clamp, focusableSurvey, path, place, useSurveySurface, type Row } from "./surface";

type Props = {
  kind: "lava" | "ice";
  points: readonly GeoPoint[];
  index: number;
  sample?: GeoPoint;
  label: string;
  value: string;
  ends: readonly [string, string];
  select: (index: number) => void;
  action?: { label: string; run: () => void };
  periods?: { year: "2013" | "2024"; select: (y: "2013" | "2024") => void };
};

export function GroundTransect({
  kind,
  points,
  index,
  sample,
  label,
  value,
  ends,
  select,
  action,
  periods,
}: Props) {
  function draw(svg: SVGSVGElement, frame: SurveyFrame) {
    const projected = points.map(({ lon, lat }) => frame.ground(lon, lat, kind === "ice" ? 1.001 : 1.009));
    const strokes: Row[][] = [];
    let strip: Row[] = [];
    for (const [i, p] of projected.entries()) {
      if (!p) {
        if (strip.length > 1) strokes.push(strip);
        strip = [];
        continue;
      }
      strip.push({
        base: { x: p.x, y: p.y - 1 },
        tip: { x: p.x, y: p.y + 1 },
        along: i / (points.length - 1),
      });
    }
    if (strip.length > 1) strokes.push(strip);
    const trace = (through: number) =>
      strokes
        .map((rows) =>
          path(rows.filter((r) => r.along <= through).map((r) => ({ x: r.base.x, y: r.base.y + 1 }))),
        )
        .join("");
    const full = trace(1);
    svg.querySelectorAll("[data-course]").forEach((el) => attr(el, "d", full));
    attr(svg.querySelector("[data-covered]"), "d", trace(index / (points.length - 1)));
    for (const [n, i] of [0, projected.length - 1].entries()) {
      const p = projected[i];
      const g = svg.querySelector('[data-end="' + n + '"]');
      place(g, p ?? null);
      const el = g?.querySelector("text");
      if (p && el) {
        const left = p.x > frame.width - 86;
        attr(el, "text-anchor", left ? "end" : "start");
        attr(el, "x", left ? "-6" : "6");
      }
    }
    const pin = sample ? frame.ground(sample.lon, sample.lat, 1.001) : projected[index];
    const pinGroup = svg.querySelector("[data-cursor]");
    place(pinGroup, pin ?? null);
    if (pin) {
      const w = Math.min(168, Math.max(112, value.length * 7.1 + 24));
      const edge = Math.min(
        frame.width - w - 6,
        Math.max(6, kind === "lava" ? pin.x - w * 0.65 : pin.x + 15),
      );
      const dy = pin.y > 112 ? (kind === "lava" ? -83 : -82) : 22;
      const dx = edge - pin.x;
      const tag = svg.querySelector("[data-card]");
      place(tag, { x: dx, y: dy });
      attr(svg.querySelector("[data-paper]"), "width", String(w));
      attr(
        svg.querySelector("[data-lead]"),
        "d",
        "M0,0L" + Math.max(dx + 5, Math.min(dx + w - 5, 9)) + "," + (dy + (dy < 0 ? (periods ? 65 : 35) : 0)),
      );
    }
    return strokes;
  }
  const { ref, events } = useSurveySurface(draw, (u) => select(Math.round(clamp(u) * (points.length - 1))));
  return (
    <svg ref={ref} className={"survey-surface ground-transect " + kind + "-transect"} data-landmark={kind}>
      <path data-course="" className="transect-bed" />
      <path data-course="" className="transect-ahead" />
      <path data-covered="" className="transect-covered" />
      <path
        data-course=""
        data-route-hit=""
        className="survey-hit"
        {...focusableSurvey}
        role="slider"
        aria-label={kind === "lava" ? "Follow the mapped lava" : "Follow the ice speed transect"}
        aria-valuemin={0}
        aria-valuemax={points.length - 1}
        aria-valuenow={index}
        aria-valuetext={value}
        onKeyDown={(e) => {
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? points.length - 1
                : e.key === "ArrowRight" || e.key === "ArrowUp"
                  ? index + 1
                  : e.key === "ArrowLeft" || e.key === "ArrowDown"
                    ? index - 1
                    : undefined;
          if (next === undefined) return;
          e.preventDefault();
          e.stopPropagation();
          select(clamp(next, points.length - 1));
        }}
        {...events}
      />
      {ends.map((name, i) => (
        <g key={name} data-end={i} data-off="" className="transect-end">
          <circle r="3" />
          <text y="17">{name}</text>
        </g>
      ))}
      <g data-cursor="" data-off="" className="transect-pointer">
        <path data-lead="" />
        <circle r="6" />
        <circle r="2.2" className="transect-dot" />
        <g data-card="">
          <rect data-paper="" height={periods ? 66 : 37} rx="3" />
          <text x="8" y="13" className="landmark-caption">
            {label}
          </text>
          <text x="8" y="29" className="landmark-value">
            {value}
          </text>
          {periods &&
            (["2013", "2024"] as const).map((y, i) => (
              <g
                key={y}
                transform={"translate(" + (i * 53 + 3) + ",36)"}
                className="survey-action period-key"
                role="button"
                {...focusableSurvey}
                aria-label={"View " + y + " at this pin"}
                aria-pressed={y === periods.year}
                onClick={() => periods.select(y)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    periods.select(y);
                  }
                }}
              >
                <rect width="52" height="28" rx="2" />
                <text x="26" y="18" textAnchor="middle">
                  {y}
                </text>
              </g>
            ))}
          {action && (
            <g
              role="button"
              {...focusableSurvey}
              aria-label="Compare Kapoho shorelines"
              className="survey-action"
              transform="translate(0,-29)"
              onClick={action.run}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  action.run();
                }
              }}
            >
              <rect width="121" height="26" rx="3" />
              <text x="8" y="17">
                {action.label} →
              </text>
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
