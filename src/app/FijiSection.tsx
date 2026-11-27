import { memo, useEffect, useState } from "react";
import { depthRecords } from "../data/depthRecords";
import {
  FIJI_SECTION_BASE_KM,
  FIJI_SECTION_KM,
  sectionCatalogue,
  fijiSectionFloor,
  projectFijiSection,
} from "../geo/fijiSection";
import { loadSlab } from "../geo/slab";
import seafloor from "../geo/fijiSeafloor.json";
import { FijiQuakeButton } from "./FijiQuakeButton";
import type { ScrubDepth } from "../globe/descentInput";
import "./fiji-section.css";

const WIDTH = FIJI_SECTION_KM;
const BASE = FIJI_SECTION_BASE_KM;
const bottomProfile = seafloor.elevationM
  .map((metres, i) => `${i ? "L" : "M"}${i * seafloor.intervalKm} ${-metres / 1000}`)
  .join("");
const levels = [100, 200, 300, 400, 500, 600, 700];

const Catalogue = memo(function Catalogue() {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    let mounted = true;
    void loadSlab()
      .then((table) => {
        if (mounted) setPaths(sectionCatalogue(table));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <g id="fiji-catalogue-marks" fill="none" strokeLinecap="round">
      {paths.map((d, i) => (
        <path key={i} d={d} strokeWidth={2.2 + i * 1.35} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
});

export function FijiSection({
  depth,
  onSelectDepth,
  onScrub,
}: {
  depth: number;
  onSelectDepth: (depth: number) => void;
  onScrub: ScrubDepth;
}) {
  const floor = fijiSectionFloor(depth);
  return (
    <>
      <svg className="fiji-section" data-depth={depth} aria-label="Fiji earthquake cross section" role="img">
        <desc>
          A 900 kilometre section through the two 2018 Fiji earthquakes. The seabed follows GEBCO 2026
          elevations sampled every five kilometres. Other points show USGS earthquakes within 100 kilometres
          either side, magnitude 4.5 and above and at least 300 kilometres deep, August 2020 to August 2025.
          Each event is projected onto the section at its reported depth.
        </desc>
        <defs>
          <linearGradient id="fiji-cut-face" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop stopColor="#182c35" />
            <stop offset=".36" stopColor="#111f28" />
            <stop offset="1" stopColor="#0b161d" />
          </linearGradient>
          <clipPath id="fiji-surveyed-depth">
            <rect width={WIDTH} height={depth} />
          </clipPath>
          <linearGradient id="fiji-slice-wall" x1="0" x2=".28" y1="0" y2="1">
            <stop stopColor="#587578" />
            <stop offset=".23" stopColor="#304951" />
            <stop offset="1" stopColor="#142831" />
          </linearGradient>
          <clipPath id="fiji-section-bottom">
            <rect width={WIDTH} height={floor} />
          </clipPath>
          <Catalogue />
        </defs>
        <g data-section-volume="">
          <path data-section-wall="" className="fiji-section-wall" fill="url(#fiji-slice-wall)" />
          <path data-section-top="" className="fiji-section-top" />
          <path data-section-top-stations="" className="fiji-section-stations" />
        </g>
        <g data-section-face="" clipPath="url(#fiji-section-bottom)">
          <rect width={WIDTH} height={BASE} fill="url(#fiji-cut-face)" />
          {levels.map((z) => (
            <line key={z} x2={WIDTH} y1={z} y2={z} className="fiji-section-rule" />
          ))}
          {depthRecords.slice(0, 2).map((r) => {
            const { alongKm } = projectFijiSection(r.lon, r.lat);
            return <line key={r.id} x1={alongKm} x2={alongKm} y2={r.depthKm} className="fiji-section-stem" />;
          })}
          <use href="#fiji-catalogue-marks" stroke="#7495a6" opacity=".38" />
          <use
            href="#fiji-catalogue-marks"
            clipPath="url(#fiji-surveyed-depth)"
            stroke="#acd6dd"
            opacity=".82"
          />
          <path d={`${bottomProfile}L${WIDTH} 0H0Z`} fill="#45676f" />
          <path d={bottomProfile} className="fiji-section-bed" />
          <path d={`M0 0V${floor}H${WIDTH}V0`} className="fiji-section-edge" />
          <line y1={depth} y2={depth} x2={WIDTH} className="fiji-section-sweep" />
        </g>
        <g data-section-line="">
          <line x2={WIDTH} className="fiji-section-datum" />
          {[0, WIDTH].map((x) => (
            <line key={x} x1={x} x2={x} y1="-4" y2="4" className="fiji-section-cap" />
          ))}
        </g>
        <g className="fiji-section-type" data-section-type="">
          <g data-section-scale="">
            {[300, 600].map((z) => (
              <text className="fiji-section-depth" key={z} data-grid-km={z} x="5" y="-4">
                {z} km
              </text>
            ))}
            <text className="fiji-section-distance" textAnchor="end" data-section-distance="">
              900 km across
            </text>
          </g>
          {depthRecords.slice(0, 2).map((r, i) => (
            <g
              key={r.id}
              data-fiji-event={r.id}
              className="fiji-section-quake"
              data-current={
                (depth >= r.depthKm - 0.05 && (i === 1 || depth < depthRecords[1].depthKm - 0.05)) ||
                undefined
              }
              data-lit={depth >= r.depthKm - 0.05 || undefined}
            >
              <circle className="fiji-event-outer" r="11" />
              <circle className="fiji-event-ring" r="6.8" />
              <circle className="fiji-event-centre" r="2.7" />
              <text x={i === 0 ? 14 : -14} y="4" textAnchor={i === 0 ? "start" : "end"}>
                {i === 0 ? "19 Aug" : "6 Sep"}
                <tspan className="fiji-section-mag" x={i === 0 ? 14 : -14} dy="-14">
                  {r.scale} {r.magnitude}
                </tspan>
              </text>
            </g>
          ))}
        </g>
        <g data-section-island="" className="fiji-section-island">
          <path d="M0 0 l7 -14 h8" />
          <circle r="2.5" />
          <text x="19" y="-11">
            Viti Levu
          </text>
        </g>
      </svg>
      {depthRecords.slice(0, 2).map((event) => (
        <FijiQuakeButton
          key={event.id}
          event={event}
          exposed={floor - event.depthKm >= 6}
          choose={onSelectDepth}
          scrub={onScrub}
        />
      ))}
    </>
  );
}
