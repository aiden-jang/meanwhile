import type { GeoPoint, MooringSection } from "../../observations/types";
import { curtainRows } from "./CurtainRows";
import { attr, facePath, mix, path, place, useSurveySurface, xy } from "./surface";

export const buoyLongitude = (lon: number) =>
  Math.abs(lon) + "°" + (Math.abs(lon) === 180 || lon === 0 ? "" : lon < 0 ? " W" : " E");
const alongBuoy = (lon: number) => ((lon - 130 + 360) % 360) / 140;
const referenceDepth = 100;

export function BuoyLine({
  points,
  buoys,
  section,
  selected,
  choose,
  explicit,
  observed,
  inspect,
}: {
  points: readonly GeoPoint[];
  buoys: readonly GeoPoint[];
  section: MooringSection;
  selected: number;
  choose: (lon: number) => void;
  explicit: number | undefined;
  observed: Set<number>;
  inspect: (lon: number) => void;
}) {
  const rows = section.readings.filter((r) => r.lon === selected);
  const reading = rows.find((r) => r.depth === referenceDepth);
  const fraction = (depth: number) => (depth - section.topDepth) / 500;
  const surface = useSurveySurface(
    (svg, frame) => {
      const strips = curtainRows(points, frame);
      attr(svg.querySelector("[data-pick]"), "d", strips.map(facePath).join(""));
      const at = alongBuoy(selected);
      const top = frame.face(selected, 0, 0, at),
        base = frame.face(selected, 0, 1, at);
      const pin = top && base ? mix(top, base, fraction(referenceDepth)) : null;
      const label = svg.querySelector("[data-reading]");
      place(label, pin && pin.x >= 6 && pin.x <= frame.width - 6 ? pin : null);
      if (!top || !base || !pin) {
        attr(svg.querySelector("[data-thread]"), "d", "");
        attr(svg.querySelector("[data-observed]"), "d", "");
        return strips;
      }
      attr(svg.querySelector("[data-thread]"), "d", path([top, base]));
      attr(
        svg.querySelector("[data-observed]"),
        "d",
        rows
          .map((r) => {
            const p = mix(top, base, fraction(r.depth));
            return "M" + xy(p) + "h4";
          })
          .join(""),
      );
      const side = pin.x + 126 > frame.width ? -1 : 1;
      attr(label?.querySelector("path") ?? null, "d", "M0 0l" + side * 12 + " -28h" + side * 12);
      for (const text of label?.querySelectorAll("text") ?? []) {
        attr(text, "x", String(side * 28));
        attr(text, "text-anchor", side === 1 ? "start" : "end");
      }
      return strips;
    },
    (p) => {
      const buoy = buoys.reduce(
        (best, b) => (Math.abs(alongBuoy(b.lon) - p) < Math.abs(alongBuoy(best.lon) - p) ? b : best),
        buoys[0]!,
      );
      choose(buoy.lon);
    },
  );
  return (
    <>
      <svg ref={surface.ref} className="survey-surface buoy-line" aria-label="Equatorial temperature section">
        <path data-pick="" fill="transparent" {...surface.events} className="survey-face" />
        <path data-thread="" className="mooring-thread" />
        <path data-observed="" className="mooring-samples" />
        <g data-reading="" data-off="">
          <path className="survey-sounding" />
          <circle r="5" className={reading ? "survey-pin" : "survey-halo"} />
          <text y="-35">
            {buoyLongitude(selected)} · {referenceDepth} m
          </text>
          <text y="-16" className="survey-number">
            {reading ? reading.temperature.toFixed(2) + " °C" : "No reading"}
          </text>
        </g>
      </svg>
      <div className="nino-moorings" aria-label="Pacific buoys">
        {buoys.map(({ lon, lat }) => (
          <button
            key={lon}
            type="button"
            data-observation-anchor=""
            data-compact-anchor=""
            data-lon={lon}
            data-lat={lat}
            data-mooring-gap={!observed.has(lon) || undefined}
            data-priority-anchor={selected === lon || undefined}
            data-projection-anchor={selected === lon || undefined}
            aria-label={`Inspect buoy ${buoyLongitude(lon)}`}
            aria-pressed={explicit === lon}
            {...surface.events}
            onClick={(event) => {
              if (event.detail === 0) inspect(lon);
            }}
          >
            <span aria-hidden="true">{buoyLongitude(lon)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
