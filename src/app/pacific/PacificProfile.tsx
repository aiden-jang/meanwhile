import type { MouseEventHandler, RefObject } from "react";
import { StoryOnward } from "../continuity/StoryOnward";
import { ShareMoment } from "../observations/StorySession";
import type { StoryMoment } from "../observations/storyMoment";
import { SaveVisit } from "../visitor/VisitShelf";
import { deepestPressure, formatReading, profileLine, profilePoint, source } from "./aloha";

function Profile({ reading }: { reading: number[] }) {
  const [pressure, temperature] = reading;
  const [x, y] = profilePoint(pressure, temperature);
  return (
    <>
      <p className="pacific-sample">
        {temperature.toFixed(2)} °C <span>at {formatReading.format(pressure)} dbar</span>
      </p>
      <svg
        viewBox="0 0 288 180"
        role="img"
        aria-label="Water cools as the cast descends. Temperature in degrees Celsius, pressure in decibars."
      >
        <g className="pacific-grid">
          {[0, 10, 20].map((tick) => (
            <text key={tick} x={profilePoint(0, tick)[0]} y="15">
              {tick}°
            </text>
          ))}
          {[0, 1000, 2000, 3000, deepestPressure].map((tick) => {
            const [, height] = profilePoint(tick, 0);
            return (
              <g key={tick}>
                <text x="0" y={height + 4}>
                  {tick === deepestPressure ? "4.8k" : tick ? tick / 1000 + "k" : "0"}
                </text>
                <path d={`M46 ${height}H278`} />
              </g>
            );
          })}
        </g>
        <polyline points={profileLine} fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx={x} cy={y} r="4" fill="currentColor" />
      </svg>
    </>
  );
}

export function PacificProfile({
  reading,
  depth,
  close,
  onClose,
  onSurface,
  current,
}: {
  reading: number[];
  depth: string;
  close: RefObject<HTMLButtonElement>;
  onClose: () => void;
  onSurface: MouseEventHandler<HTMLButtonElement>;
  current: () => StoryMoment | undefined;
}) {
  return (
    <section className="pacific-profile" aria-labelledby="pacific-profile-title">
      <header>
        <h3 id="pacific-profile-title">Station ALOHA</h3>
        <button ref={close} type="button" onClick={onClose}>
          Close reading
        </button>
      </header>
      <p className="pacific-cast-date">
        19 December 2024 <span>{depth} m deep</span>
      </p>
      <Profile reading={reading} />
      <StoryOnward id="surface-at-aloha" label="Surface at Station ALOHA" onClick={onSurface} />
      <div className="pacific-profile-actions">
        <SaveVisit />
        <ShareMoment current={current} label="Share reading" />
      </div>
      <a href={source} target="_blank" rel="noreferrer">
        University of Hawaiʻi cast data
      </a>
    </section>
  );
}
