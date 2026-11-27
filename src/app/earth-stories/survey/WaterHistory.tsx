import type { StoryFrame } from "../types";
import type { SurveyFrame } from "../../../globe/surveyProjection";
import { waterClass, waterColors, waterPoint, waterStates } from "../aralSamples";
import { attr, clamp, focusableSurvey, place, useSurveySurface } from "./surface";

export function WaterHistory({
  table,
  cell,
  index,
  frames,
  seek,
  move,
}: {
  table: Uint8Array;
  cell: number;
  index: number;
  frames: readonly StoryFrame[];
  seek: (i: number) => void;
  move: (lon: number, lat: number) => void;
}) {
  const point = waterPoint(table, cell)!;
  const count = frames.length,
    w = 145,
    x0 = 9,
    dx = (w - 2 * x0) / (count - 1);
  const code = waterClass(table, cell, index),
    year = frames[index]!.dateTime;
  function draw(svg: SVGSVGElement, f: SurveyFrame) {
    const p = f.ground(point.lon, point.lat, 1.009);
    const station = svg.querySelector("[data-station]");
    // Keep the pin on its real cell. Only its small reading slips inward at a viewport edge.
    if (!p || p.x < -2 || p.x > f.width + 2 || p.y < -2 || p.y > f.height + 2) {
      place(station, null);
      return [];
    }
    place(station, p);
    const left = Math.min(f.width - w - 7, Math.max(7, p.x + 20));
    const top = p.y > 124 ? p.y - 77 : p.y + 17;
    place(svg.querySelector("[data-water-card]"), { x: left - p.x, y: top - p.y });
    attr(
      svg.querySelector("[data-lead]"),
      "d",
      "M0,0L" + (left - p.x + 6) + "," + (top - p.y + (top < p.y ? 55 : 0)),
    );
    return [
      [0, 1].map((along) => ({
        along,
        base: { x: left + x0 + along * dx * (count - 1), y: top + 40 },
        tip: { x: left + x0 + along * dx * (count - 1), y: top + 54 },
      })),
    ];
  }
  const { ref, events } = useSurveySurface(draw, (u) => seek(Math.round(clamp(u) * (count - 1))));
  return (
    <svg
      ref={ref}
      className="survey-surface water-history"
      data-landmark="water"
      data-cell={cell}
      data-year={year}
      data-class={code}
      data-lon={point.lon}
      data-lat={point.lat}
    >
      <desc id="lakebed-reading">{year + " · " + waterStates[code]}</desc>
      <g data-station="" data-off="">
        <g className="water-station">
          <path data-lead="" />
          <circle
            r="6.5"
            className="water-pin"
            role="button"
            {...focusableSurvey}
            aria-label="Move lakebed sampling pin"
            aria-description="Use the arrow keys to sample nearby ground. Enter selects the year control."
            aria-describedby="lakebed-reading"
            onClick={() => document.getElementById("earth-story-time")?.focus({ preventScroll: true })}
            onKeyDown={(event) => {
              const directions: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, 1],
                ArrowDown: [0, -1],
              };
              const direction = directions[event.key];
              if (direction) move(...direction);
              else if (event.key === "Enter" || event.key === " ")
                document.getElementById("earth-story-time")?.focus({ preventScroll: true });
              else return;
              event.preventDefault();
              event.stopPropagation();
            }}
          />
          <circle r="2.4" className="water-centre" />
        </g>
        <g data-water-card="">
          <rect data-paper="" width={w} height="59" rx="3" />
          <text x="9" y="14" className="landmark-caption">
            {year} · Lakebed pin
          </text>
          <text x="9" y="30" className="landmark-value">
            {waterStates[code]}
          </text>
          {frames.map((frame, i) => (
            <rect
              key={frame.at}
              x={x0 + i * dx - 1.8}
              y="42"
              width="3.8"
              height="7"
              rx=".7"
              fill={waterColors[waterClass(table, cell, i)]}
            />
          ))}
          <path className="year-cursor" d={"M" + (x0 + index * dx - 3.4) + ",36h6.8l-3.4,5Z"} />
          <path
            data-water-hit=""
            d={"M" + x0 + ",46H" + (w - x0)}
            className="survey-hit"
            aria-hidden="true"
            {...events}
          />
        </g>
      </g>
    </svg>
  );
}
