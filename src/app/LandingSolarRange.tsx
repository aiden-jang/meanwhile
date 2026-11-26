import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  landingSolarTime,
  setSolarOffsetMinutes,
  solarOffsetMinutes,
  subscribeLandingSun,
} from "../globe/landingSolarClock";
import { geographicCoordinates } from "../globe/orbitReadout";
import { subsolarPoint } from "../geo/sun";
import { solarClockReading } from "./solarClockReading";
import "./landing-solar-range.css";

export function LandingSolarRange({ at }: { at: number }) {
  const offset = useSyncExternalStore(subscribeLandingSun, solarOffsetMinutes);
  useLayoutEffect(() => () => setSolarOffsetMinutes(0), []);
  const selected = landingSolarTime(at, offset);
  const { iso, clock, description } = solarClockReading(selected);
  return (
    <>
      <section className="landing-solar-bar" aria-label="Solar lighting">
        <label htmlFor="landing-solar-time">Day–night</label>
        <input
          id="landing-solar-time"
          aria-label="Day–night time"
          aria-valuetext={description}
          aria-describedby="landing-solar-note"
          type="range"
          min={-360}
          max={360}
          step={1}
          value={offset}
          onChange={(event) => setSolarOffsetMinutes(event.currentTarget.valueAsNumber)}
        />
        <time dateTime={iso} title={description}>
          {clock}
        </time>
        <button
          id="landing-solar-now"
          type="button"
          onClick={() => setSolarOffsetMinutes(0)}
          title="Reset sunlight to the current time"
        >
          Now
        </button>
        <span className="sr-only" id="landing-solar-note">
          Scrub sunlight. Radar and reports keep their source times.
        </span>
      </section>
      <div>
        <span>Sun overhead</span> <strong>{geographicCoordinates(subsolarPoint(selected))}</strong>
      </div>
    </>
  );
}
