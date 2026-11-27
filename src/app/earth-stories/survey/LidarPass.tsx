import type { GeoPoint } from "../../observations/types";
import type { LidarCursor } from "../DustProfile";
import { curtainRows, curtainSample } from "./CurtainRows";
import { attr, clamp, facePath, mix, path, place, useSurveySurface } from "./surface";

export function LidarPass({
  points,
  open,
  ready,
  sameDay,
  cursor,
  raise,
  select,
}: {
  points: readonly GeoPoint[];
  open: boolean;
  ready: boolean;
  sameDay: boolean;
  cursor: LidarCursor | null;
  raise: () => void;
  select: (c: LidarCursor) => void;
}) {
  const [along, altitude] = cursor ?? [50, 50];
  const surface = useSurveySurface(
    (svg, frame) => {
      const island = frame.ground(-71.25, 19.0);
      place(
        svg.querySelector("[data-island]"),
        open && island && island.x > 95 && island.y > 24 && island.y < frame.height - 24 ? island : null,
      );
      const ground = points.map((p) => frame.ground(p.lon, p.lat)).filter((p) => p !== null);
      attr(svg.querySelector("[data-swath]"), "d", path(ground));
      const at = frame.ground(points[1]!.lon, points[1]!.lat);
      const launch = svg.querySelector("[data-lift]");
      const safe = at && at.x > 14 && at.x < frame.width - 12 && at.y > 23 && at.y < frame.height - 34;
      place(launch, !open && safe ? at : null);
      attr(launch?.querySelector("rect") ?? null, "x", at && at.x > frame.width - 118 ? "-105" : "8");
      attr(launch?.querySelector("text") ?? null, "x", at && at.x > frame.width - 118 ? "-96" : "17");
      const strips = ready ? curtainRows(points, frame) : [];
      attr(svg.querySelector("[data-face]"), "d", strips.map(facePath).join(""));
      attr(svg.querySelector("[data-rim]"), "d", strips.map((r) => path(r.map((p) => p.tip))).join(""));
      const reading = svg.querySelector("[data-reading]");
      const sample = cursor && curtainSample(strips, along / 100);
      if (!sample) {
        place(reading, null);
        attr(svg.querySelector("[data-beam]"), "d", "");
        return strips;
      }
      const { foot, tip } = sample;
      const pin = mix(foot, tip, altitude / 100);
      attr(svg.querySelector("[data-beam]"), "d", path([foot, tip]));
      place(reading, pin);
      const left = pin.x > frame.width - 130;
      attr(reading?.querySelector("text") ?? null, "x", left ? "-12" : "12");
      attr(reading?.querySelector("text") ?? null, "text-anchor", left ? "end" : "start");
      return strips;
    },
    (u, v) => select([Math.round(clamp(u) * 100), Math.round(clamp(v) * 100)]),
  );
  return (
    <svg className="survey-surface" ref={surface.ref} aria-label="CALIPSO measurement over the Caribbean">
      <g data-island="" data-off="">
        <path d="M0 0l-12 13h-12" className="survey-datum" />
        <text x="-28" y="17" textAnchor="end">
          Hispaniola
        </text>
      </g>
      <path data-swath="" className="survey-datum" />
      <path data-rim="" className="lidar-rim" />
      <path data-beam="" className="survey-sounding" />
      <g data-reading="" data-off="">
        <circle r="7" className="survey-halo" />
        <circle r="2" className="survey-pin" />
        <text y="-7" className="survey-number">
          {(altitude * 0.15).toFixed(1)} km
        </text>
      </g>
      <path data-face="" fill="transparent" className="survey-face" {...surface.events} />
      {!open && (
        <g
          data-lift=""
          data-off=""
          role="button"
          tabIndex={0}
          aria-label="Raise the CALIPSO profile"
          className="survey-action"
          onClick={raise}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              raise();
            }
          }}
        >
          <circle r="4" className="survey-pin" />
          <rect x="8" y="-18" width="97" height="36" rx="4" />
          <text x="17" y="5">
            {sameDay ? "Lift the profile ↑" : "23 Jun pass ↑"}
          </text>
        </g>
      )}
    </svg>
  );
}
