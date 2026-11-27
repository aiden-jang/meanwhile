import { memo } from "react";
import { castTrace } from "./aloha";
import { meridian, southernEdge } from "./alohaTransect";
import instrument from "./ctd.webp";

const ticks = [1000, 2000, 3000, 4000];
const trace = castTrace
  .map(([temperature, depth]) => `${temperature.toFixed(3)},${depth.toFixed(2)}`)
  .join(" ");

export const PacificSection = memo(function PacificSection() {
  return (
    <svg
      className="pacific-section"
      role="img"
      aria-label="Station ALOHA to Oʻahu, with the cast descending from its surface location and the measured temperature profile beside it."
    >
      <defs>
        <linearGradient id="aloha-water" gradientUnits="userSpaceOnUse" x2="0" y2="5000">
          <stop stopColor="#5cbecc" />
          <stop offset=".035" stopColor="#287e9d" />
          <stop offset=".2" stopColor="#175675" />
          <stop offset=".57" stopColor="#103753" />
          <stop offset="1" stopColor="#0a233b" />
        </linearGradient>
        <linearGradient id="aloha-rock" x2=".32" y2="1">
          <stop stopColor="#597575" />
          <stop offset=".52" stopColor="#344c54" />
          <stop offset="1" stopColor="#23343d" />
        </linearGradient>
        <clipPath id="aloha-reveal">
          <rect data-window="" x="-1" width="1002" height="0" />
        </clipPath>
        <clipPath id="aloha-ocean">
          <path d={meridian.water} />
        </clipPath>
        <clipPath id="aloha-samples">
          <rect data-samples="" x="-1" width="30" height="0" />
        </clipPath>
        <clipPath id="aloha-trace-window">
          <rect data-trace-window="" x="-1" width="30" height="0" />
        </clipPath>
      </defs>
      <path data-surround="" fill="#071218" fillRule="evenodd" />
      <g data-side="" clipPath="url(#aloha-reveal)">
        <path d={southernEdge.water} fill="url(#aloha-water)" />
        <path d={southernEdge.rock} fill="url(#aloha-rock)" />
        <path d={southernEdge.floor} className="pacific-bed-line" />
        <path d="M0 0H1000V5140H0Z" fill="#00101b" opacity=".39" />
      </g>
      <path data-deck="" className="pacific-deck-edge" />
      <g data-face="" clipPath="url(#aloha-reveal)">
        <path d={meridian.rock} fill="url(#aloha-rock)" />
        <path d={meridian.water} fill="url(#aloha-water)" />
        <g clipPath="url(#aloha-ocean)" className="pacific-depth-rules">
          {ticks.map((m) => (
            <path key={m} d={`M0 ${m}H1000`} />
          ))}
        </g>
        <path d={meridian.floor} className="pacific-bed-line" />
      </g>
      <path data-datum="" className="pacific-datum" />
      <g className="pacific-scale-notes">
        {ticks.map((m) => (
          <text key={m} data-meters={m} textAnchor="end" dy="4">
            {m / 1000} km
          </text>
        ))}
      </g>
      <g data-cast-plot="" clipPath="url(#aloha-trace-window)">
        <polyline points={trace} className="pacific-future-trace" />
        <g clipPath="url(#aloha-samples)">
          <polyline points={trace} className="pacific-measured-trace" />
        </g>
      </g>
      <path data-cable="" className="pacific-cable" />
      <g data-package="">
        <image href={instrument} x="-17" y="-15" width="34" height="33" />
      </g>
      <g data-thermometer="" className="pacific-thermometer">
        <circle r="3" />
        <text x="9" y="4" />
      </g>
      <g data-island="" className="pacific-island">
        <circle r="2" />
        <text x="7" dy="4">
          Oʻahu
        </text>
      </g>
      <g data-station="" className="pacific-station">
        <path d="M0 -5v-13l-8 -7h-10" />
        <circle r="5" />
        <circle r="1.6" />
        <text x="-9" y="-33" textAnchor="middle">
          Station ALOHA
        </text>
      </g>
    </svg>
  );
});
