import { useRef } from "react";
import type { sectionSamples } from "../terrainSection";
import { attr, clamp, facePath, mix, path, place, useSurveySurface, xy, type Row } from "./surface";

type Samples = ReturnType<typeof sectionSamples>;

export function TrenchFlight({
  samples,
  bounds,
  position,
  progress,
  select,
  fly,
  flight,
}: {
  samples: Samples;
  bounds: readonly number[];
  position: number;
  progress: number;
  select: (at: number) => void;
  fly: (at: number) => void;
  flight: boolean;
}) {
  const startDrag = useRef({ y: 0, progress: 0 });
  const residual = useRef(0);
  const lastStep = useRef(-1);
  const last = samples.length - 1;
  const reading = samples[position]!;
  const depth =
    reading.meters === null
      ? "No sounding"
      : Math.abs(reading.meters).toLocaleString("en-US") + (reading.meters > 0 ? " m above sea level" : " m");
  const surface = useSurveySurface(
    (svg, { ground, width, height }) => {
      const corners = [
        [bounds[0]!, bounds[1]!],
        [bounds[2]!, bounds[1]!],
        [bounds[2]!, bounds[3]!],
        [bounds[0]!, bounds[3]!],
      ]
        .map(([lon, lat]) => ground(lon!, lat!))
        .filter((p) => p !== null);
      attr(svg.querySelector("[data-relief-touch]"), "d", corners.length === 4 ? path(corners) + "Z" : "");
      const rows: Row[] = [];
      const lift = 0.18 + 0.82 * Math.sin((Math.min(1, progress * 1.7) * Math.PI) / 2);
      const scale = (Math.min(width * 0.29, height * 0.27, 142) * lift) / 11000;
      for (let i = 0; i < samples.length; i++) {
        const p = samples[i]!,
          base = ground(p.lon, p.lat, 1.038);
        if (!base || p.meters === null) continue;
        const down = Math.max(0, -p.meters) * scale;
        rows.push({ base, tip: { x: base.x + down * 0.77, y: base.y + down * 0.58 }, along: i / last });
      }
      const layer = svg.querySelector("[data-trench]");
      const tip = rows.at(-1);
      layer?.toggleAttribute("data-off", !tip);
      if (!tip) return [];
      attr(svg.querySelector("[data-wall]"), "d", facePath(rows));
      const bed = path(rows.map((r) => r.tip));
      attr(svg.querySelector("[data-bed]"), "d", bed);
      attr(svg.querySelector("[data-pick]"), "d", bed);
      attr(svg.querySelector("[data-datum]"), "d", path(rows.map((r) => r.base)));
      attr(
        svg.querySelector("[data-baths]"),
        "d",
        [2500, 5000, 7500, 10000]
          .map((m) => {
            let d = "",
              connected = false;
            for (const r of rows) {
              const bedDepth = -(samples[Math.round(r.along * last)]!.meters ?? 0);
              if (bedDepth < m) {
                connected = false;
                continue;
              }
              d += (connected ? "L" : "M") + xy(mix(r.base, r.tip, m / bedDepth));
              connected = true;
            }
            return d;
          })
          .join(" "),
      );
      const r = rows.find((v) => Math.round(v.along * last) === position);
      place(svg.querySelector("[data-probe]"), r?.tip ?? null);
      if (r) {
        attr(svg.querySelector("[data-sounding]"), "d", path([r.base, r.tip]));

        const text = svg.querySelector("[data-probe] text");
        const left = r.tip.x > width - 105;
        attr(text, "x", left ? "-12" : "12");
        attr(text, "text-anchor", left ? "end" : "start");
        attr(text, "y", r.tip.y > height * 0.58 ? "-10" : "16");
      }
      if (!r) attr(svg.querySelector("[data-sounding]"), "d", "");
      place(svg.querySelector("[data-trench-end]"), tip.along === 1 ? tip.base : null);
      return [rows];
    },
    (along) => select(Math.round(clamp(along) * 100)),
    flight
      ? (delta) => {
          if (Math.abs(lastStep.current - progress * 100) > 1.1) residual.current = 0;
          const next = clamp(progress * 100 + residual.current + delta * 0.13, 100);
          lastStep.current = Math.round(next);
          residual.current = next - lastStep.current;
          fly(lastStep.current);
        }
      : undefined,
  );
  return (
    <svg ref={surface.ref} className="survey-surface" aria-label="Measured seafloor transect">
      <defs>
        <linearGradient id="trench-water" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop stopColor="#276676" />
          <stop offset=".58" stopColor="#0e3848" />
          <stop offset="1" stopColor="#061e2a" />
        </linearGradient>
      </defs>
      {flight && (
        <path
          data-relief-touch=""
          className="trench-touch-water"
          fill="transparent"
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button !== 0) return;
            startDrag.current = { y: e.clientY, progress };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              const span = surface.ref.current!.getBoundingClientRect().height;
              fly(
                Math.round(
                  clamp(startDrag.current.progress + (e.clientY - startDrag.current.y) / (span * 0.65)) * 100,
                ),
              );
            }
          }}
        />
      )}
      <g data-trench="" data-off="">
        <path data-wall="" fill="url(#trench-water)" {...surface.events} className="survey-face" />
        <path data-baths="" className="trench-contours" />
        <path data-datum="" className="survey-datum" />
        <path data-bed="" className="trench-bed" />
        <path data-sounding="" className="survey-sounding" />
        <g data-trench-end="">
          <circle r="3" className="survey-pin" />
          <text x="0" y="-12" textAnchor="middle">
            {flight ? "Challenger Deep region" : "Section end"}
          </text>
        </g>
        <g data-probe="">
          <circle r="8" className="survey-halo" />
          <circle r="3" className="survey-pin" />
          <text className="survey-number">{depth}</text>
        </g>
        <path data-pick="" {...surface.events} className="survey-hit" />
      </g>
    </svg>
  );
}
