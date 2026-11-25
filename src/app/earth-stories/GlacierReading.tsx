import type { RefObject } from "react";
import { latLon } from "../format";
import {
  glacierCell,
  glacierPlaces,
  glacierPoint,
  glacierYears,
  type GlacierReadings,
} from "./glacierReadings";

const speedFormat = new Intl.NumberFormat("en-US");
const speedText = (speed: number | undefined) => (speed === undefined ? "—" : speedFormat.format(speed));

export function GlacierReading({
  grid,
  sample,
  details,
  outside,
  button,
  back,
  select,
  inspect,
  onBack,
}: {
  grid: GlacierReadings;
  sample: number;
  details: boolean;
  outside: boolean;
  button: RefObject<HTMLButtonElement>;
  back: RefObject<HTMLButtonElement>;
  select: (sample: number) => void;
  inspect: () => void;
  onBack: () => void;
}) {
  const places = glacierPlaces.map(({ label, lon, lat }) => ({
    label,
    cell: glacierCell(grid, { lon, lat }),
  }));
  const speeds = glacierYears.map((year) => {
    const speed = grid.samples[year][sample];
    return speed !== undefined && speed >= 0 ? speed : undefined;
  });
  const [earlier, later] = speeds;
  const delta = earlier === undefined || later === undefined ? undefined : later - earlier;
  const point = glacierPoint(grid, sample);
  return (
    <>
      <dl className="velocity-readings" aria-label="Velocity at the pinned point">
        {glacierYears.map((year, index) => {
          const speed = speeds[index];
          return (
            <div key={year} className="glacier-speed">
              <dt>{year}</dt>
              <dd>
                {speedText(speed)}
                <span className="sr-only">{speed === undefined ? " No usable reading" : " m/year"}</span>
              </dd>
              <span className="glacier-speed-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (speed ?? 0) / 120)}%` }} />
              </span>
            </div>
          );
        })}
      </dl>
      <p className="glacier-speed-change">
        {delta === undefined
          ? "No usable reading in one or both years."
          : delta === 0
            ? "Same speed in both years."
            : `${speedText(Math.abs(delta))} m/year ${delta < 0 ? "slower" : "faster"} in 2024`}
      </p>
      {!details && (
        <div className="glacier-reading-actions">
          <label className="observation-picker">
            <span>Sample location</span>
            <select
              aria-label="Reading location"
              value={sample}
              onChange={(event) => select(Number(event.currentTarget.value))}
            >
              {places.map(({ label, cell }) => (
                <option key={label} value={cell}>
                  {label}
                </option>
              ))}
              {!places.some(({ cell }) => cell === sample) && <option value={sample}>On the glacier</option>}
            </select>
          </label>
          <button type="button" ref={button} onClick={inspect}>
            Inspect this point
          </button>
        </div>
      )}
      {outside && !details && (
        <p className="observation-note" role="status">
          Choose a point inside the survey. Showing your last reading.
        </p>
      )}
      {details && (
        <div className="glacier-point-details">
          <div className="glacier-detail-heading">
            <h3>Point details</h3>
            <button ref={back} type="button" onClick={onBack}>
              Back to comparison
            </button>
          </div>
          <p className="glacier-coordinate">{latLon(point.lon, point.lat)}</p>
          <p>Annual mean ice speed in the same sampled cell for both years.</p>
          <a href="https://its-live.jpl.nasa.gov/" target="_blank" rel="noreferrer">
            NASA ITS_LIVE · annual velocity mosaics
          </a>
        </div>
      )}
    </>
  );
}
