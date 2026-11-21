import { useCallback, useMemo, useState } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import { surveyComparison } from "../observations/surveyComparison";
import type { GeoPoint, ObservationFrame } from "../observations/types";
import { useObservationImage } from "../observations/useObservationData";
import { glacierCell, glacierPlaces, glacierPoint, glacierYears } from "./glacierReadings";
import type { EarthStoryData } from "./types";

export function useGlacierComparison(
  glacier: EarthStoryData["glacier"],
  chapter: string | undefined,
  pause: () => void,
) {
  const saved = /^velocity:(\d{1,5}),(\d{1,3})$/.exec(chapter ?? "");
  const grid = glacier?.readings;
  const [comparing, setComparing] = useState(!!grid && !!saved);
  const [divider, setDivider] = useState(saved ? Math.min(100, Number(saved[2])) : 50);
  const [sample, setSample] = useState(() => {
    if (!grid) return undefined;
    const cell = saved ? Number(saved[1]) : -1;
    return cell >= 0 && cell < grid.columns * grid.rows ? cell : glacierCell(grid, glacierPlaces[0]!);
  });
  const [outside, setOutside] = useState(false);
  const earlier = useObservationImage(comparing ? glacier?.earlier : undefined, "glacier-earlier");
  const later = useObservationImage(comparing ? glacier?.later : undefined, "glacier-later");
  const ready = earlier.status === "ready" && later.status === "ready";
  const surface = useMemo(
    () =>
      comparing && ready && earlier.element && later.element
        ? surveyComparison(earlier.element, later.element)
        : undefined,
    [comparing, ready, earlier.element, later.element],
  );
  const mark = useMemo<ObservationFrame["marks"]>(() => {
    if (!comparing || !grid || sample === undefined) return undefined;
    return [{ ...glacierPoint(grid, sample), size: 12, color: 0xf6dc9f }];
  }, [comparing, grid, sample]);
  const pick = useCallback(
    (point: GeoPoint) => {
      if (!grid) return;
      const cell = glacierCell(grid, point);
      setOutside(cell === undefined);
      if (cell !== undefined) {
        pause();
        setSample(cell);
      }
    },
    [grid, pause],
  );
  const places = grid
    ? glacierPlaces.map((place) => ({ label: place.label, cell: glacierCell(grid, place) }))
    : [];
  const failed = [earlier, later].find((image) => image.status === "failed");
  return {
    comparing,
    surface,
    divider: divider / 100,
    mark,
    pick: comparing ? pick : undefined,
    chapter: comparing && sample !== undefined ? `velocity:${sample},${divider}` : "",
    control: grid && (
      <section className="terrain-comparison" aria-label="Glacier velocity comparison">
        <div className="observatory-actions">
          <button
            type="button"
            aria-pressed={comparing}
            onClick={() => {
              pause();
              refreshAnnotations({ camera: "hold" });
              setComparing(!comparing);
            }}
          >
            {comparing ? "Close velocity comparison" : "Compare 2013 and 2024"}
          </button>
        </div>
        {comparing && (
          <>
            <div className="velocity-divider">
              <label htmlFor="velocity-divider">
                <span>2013</span>
                <span>2024</span>
              </label>
              <input
                id="velocity-divider"
                className="scrub-slider"
                type="range"
                min={0}
                max={100}
                value={divider}
                aria-label="Velocity map divider"
                aria-valuetext={`${divider}% 2013 · ${100 - divider}% 2024`}
                disabled={!surface}
                onInput={(event) => setDivider(event.currentTarget.valueAsNumber)}
              />
            </div>
            {failed ? (
              <button type="button" onClick={failed.retry}>
                Retry matching velocity image
              </button>
            ) : (
              !surface && (
                <p className="observation-note" role="status">
                  Loading both velocity maps…
                </p>
              )
            )}
            <label className="observation-picker">
              <span>Reading location</span>
              <select
                value={sample}
                onChange={(event) => {
                  setOutside(false);
                  setSample(Number(event.currentTarget.value));
                }}
              >
                {places.map(({ label, cell }) => (
                  <option key={label} value={cell}>
                    {label}
                  </option>
                ))}
                {!places.some(({ cell }) => cell === sample) && (
                  <option value={sample}>Pinned on the map</option>
                )}
              </select>
            </label>
            <p className="observation-note">
              {outside
                ? "Choose a point inside the survey. Showing your last reading."
                : "Tap the glacier to sample the same point in both years."}
            </p>
            {sample !== undefined && (
              <dl className="observation-values velocity-readings" aria-label="Velocity at the pinned point">
                {glacierYears.map((year) => {
                  const velocity = grid.samples[year][sample];
                  return (
                    <div key={year}>
                      <dt>{year}</dt>
                      <dd>
                        {velocity === undefined || velocity < 0
                          ? "No usable reading"
                          : `${velocity.toLocaleString()} m/year`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
            <p className="observation-note">
              Nearest sampled grid cell · flow traces follow the selected year.
            </p>
          </>
        )}
      </section>
    ),
  };
}
