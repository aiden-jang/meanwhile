import { useCallback, useMemo, useRef, useState } from "react";
import { BuoyLine, buoyLongitude } from "./survey/BuoyLine";
import type { ObservationFrame, ObservationView } from "../observations/types";
import type { StoryFrame } from "./types";

type Buoy = { lon: number; lat: number };
const NO_BUOYS: Buoy[] = [];
export function useMooringInspection(
  frame: ObservationFrame,
  frames: readonly StoryFrame[],
  chapter: string | undefined,
  pause: () => void,
) {
  const section = frame.moorings,
    line = frame.section?.points;
  const buoys = useMemo(() => {
    if (!frames[0]?.moorings) return NO_BUOYS;
    const sites = new Set(frames.flatMap((frame) => frame.moorings?.readings.map(({ lon }) => lon) ?? []));
    return [...sites].sort((a, b) => ((a + 360) % 360) - ((b + 360) % 360)).map((lon) => ({ lon, lat: 0 }));
  }, [frames]);
  const [selected, select] = useState<number | undefined>(() => {
    if (!chapter?.startsWith("mooring:")) return undefined;
    const lon = Number(chapter.split(":")[1]);
    return buoys.some((buoy) => buoy.lon === lon) ? lon : undefined;
  });
  const [show, setShow] = useState(
    chapter === "moorings" || (selected !== undefined && !chapter?.endsWith(":hidden")),
  );
  const details = useRef<HTMLDetailsElement>(null);
  const reading = useRef<HTMLParagraphElement>(null);
  const observed = useMemo(() => new Set(section?.readings.map(({ lon }) => lon)), [section]);
  const defaultBuoy = buoys.find((buoy) => buoy.lon === -155)?.lon ?? buoys[0]?.lon;
  const current = selected ?? defaultBuoy;
  const rows = useMemo(
    () => section?.readings.filter(({ lon }) => lon === current).sort((a, b) => a.depth - b.depth),
    [section, current],
  );
  const inspect = useCallback(
    (lon: number) => {
      pause();
      select(lon);
      setShow(true);
      requestAnimationFrame(() => {
        if (details.current) details.current.open = true;
        reading.current?.scrollIntoView({ block: "nearest" });
      });
    },
    [pause],
  );
  const picks = useMemo<ObservationView["pickMarks"]>(
    () => (buoys.length ? { points: buoys, select: (index) => inspect(buoys[index]!.lon) } : undefined),
    [buoys, inspect],
  );
  return {
    cue: section && "Drag across the buoys · scrub the months",
    visible: show ? section : undefined,
    selected: show ? selected : undefined,
    chapter:
      selected === undefined ? (show ? "moorings" : "") : `mooring:${selected}${show ? "" : ":hidden"}`,
    picks,
    labels: section && (
      <>
        {line && buoys.length > 0 && (
          <BuoyLine
            points={line}
            buoys={buoys}
            section={section}
            selected={current!}
            explicit={show ? selected : undefined}
            observed={observed}
            inspect={inspect}
            choose={(lon) => {
              pause();
              select(lon);
              setShow(true);
            }}
          />
        )}
      </>
    ),
    controls: section && (
      <div data-evidence-body="">
        <div className="observatory-actions">
          <button
            type="button"
            aria-pressed={show}
            onClick={() => {
              if (!show) pause();
              setShow(!show);
            }}
          >
            Show measured depths
          </button>
        </div>
        {show && (
          <>
            <p className="observation-note">Dots mark depths with a recorded monthly mean.</p>
            <details ref={details} className="observation-details" open={selected !== undefined || undefined}>
              <summary>Read monthly means</summary>
              <label className="observation-picker">
                <span>Mooring longitude</span>
                <select value={current} onChange={(event) => inspect(Number(event.currentTarget.value))}>
                  {buoys.map(({ lon }) => (
                    <option key={lon} value={lon}>
                      {buoyLongitude(lon)}
                    </option>
                  ))}
                </select>
              </label>
              <p ref={reading} className="observation-note" data-evidence-point="">
                {current !== undefined && buoyLongitude(current)} · Monthly temperatures
              </p>
              {rows?.length ? (
                <dl className="observation-values">
                  {rows.map(({ depth, temperature, days }) => (
                    <div key={depth}>
                      <dt>{depth} m</dt>
                      <dd>
                        {temperature.toFixed(2)} °C · {days} days
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="observation-note">No usable readings at this buoy this month.</p>
              )}
            </details>
          </>
        )}
      </div>
    ),
  };
}
