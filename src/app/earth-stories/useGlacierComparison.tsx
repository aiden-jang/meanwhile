import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import type { ReplayProps } from "../observations/RecordedReplay";
import { captureReplayFrame, restoreReplayFrame } from "../observations/replayReturn";
import type { StoryMoment } from "../observations/storyMoment";
import { surveyComparison } from "../observations/surveyComparison";
import type { GeoPoint, ObservationFrame } from "../observations/types";
import { useObservationImage } from "../observations/useObservationData";
import { GlacierReading } from "./GlacierReading";
import { GlacierTransect } from "./GlacierTransect";
import { GlacierWorld } from "./GlacierWorld";
import { glacierCell, glacierPlaces, glacierPoint } from "./glacierReadings";
import type { EarthStoryData } from "./types";

type GlacierCamera = Pick<ReplayProps, "map" | "onMap" | "readCamera" | "restoreCamera">;

export function useGlacierComparison(
  glacier: EarthStoryData["glacier"],
  initial: StoryMoment | undefined,
  pause: () => void,
  panel: GlacierCamera,
) {
  const guided = !!useStoryNavigation()?.route;
  const saved = /^velocity:(\d{1,5}),(\d{1,3})$/.exec(initial?.chapter ?? "");
  const grid = glacier?.readings;
  const [comparing, setComparing] = useState(
    !!grid && (!!saved || (!guided && initial?.at === undefined && initial?.choice === undefined)),
  );
  const [divider, setDivider] = useState(saved ? Math.min(100, Number(saved[2])) : 50);
  const sweepFrame = useRef(0);
  function moveDivider(next: number) {
    cancelAnimationFrame(sweepFrame.current);
    setDivider(next);
  }
  function showYear(year: "2013" | "2024") {
    cancelAnimationFrame(sweepFrame.current);
    const end = year === "2013" ? 100 : 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || divider === end) {
      setDivider(end);
      return;
    }
    const start = performance.now();
    function sweep(now: number) {
      const u = Math.min(1, (now - start) / 420);
      setDivider(Math.round(divider + (end - divider) * u * u * (3 - 2 * u)));
      if (u < 1) sweepFrame.current = requestAnimationFrame(sweep);
    }
    sweepFrame.current = requestAnimationFrame(sweep);
  }
  useLayoutEffect(() => () => cancelAnimationFrame(sweepFrame.current), []);
  const [sample, setSample] = useState(() => {
    if (!grid) return undefined;
    const cell = saved ? Number(saved[1]) : -1;
    return cell >= 0 && cell < grid.columns * grid.rows ? cell : glacierCell(grid, glacierPlaces[0]!);
  });
  const [outside, setOutside] = useState(false);
  const [details, setDetails] = useState(false);
  const [framed, setFramed] = useState(false);
  const framing = useMemo(
    () => (grid ? { map: panel.map, onReady: () => setFramed(true) } : undefined),
    [grid, panel.map],
  );
  const compactTarget = useMemo(
    () =>
      grid && matchMedia("(max-width: 599px) and (max-height: 700px)").matches
        ? { lon: -49.575, lat: 69.145, zoom: 2.6 }
        : undefined,
    [grid],
  );
  const detailsOpener = useRef<HTMLButtonElement>(null);
  const detailsBack = useRef<HTMLButtonElement>(null);
  const returnFrame = useRef<ReturnType<typeof captureReplayFrame>>();
  useLayoutEffect(() => {
    if (details) detailsBack.current?.focus({ preventScroll: true });
  }, [details]);
  useLayoutEffect(() => {
    if (comparing) pause();
  }, [comparing, pause]);
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
    return [{ ...glacierPoint(grid, sample), size: 8, color: 0xf6dc9f, lift: 0.001 }];
  }, [comparing, grid, sample]);
  const select = useCallback(
    (cell: number) => {
      pause();
      setOutside(false);
      setSample(cell);
    },
    [pause],
  );
  const pick = useCallback(
    (point: GeoPoint) => {
      if (!grid) return;
      const cell = glacierCell(grid, point);
      if (cell === undefined) setOutside(true);
      else select(cell);
    },
    [grid, select],
  );
  const failed = [earlier, later].find((image) => image.status === "failed");
  function inspect(opener: HTMLButtonElement | null) {
    returnFrame.current = { ...captureReplayFrame(panel), focus: opener };
    setDetails(true);
  }
  function closeDetails() {
    setDetails(false);
    restoreReplayFrame(returnFrame.current, panel, () => detailsOpener.current);
  }
  function changeMode() {
    pause();
    setOutside(false);
    setComparing(!comparing);
  }

  return {
    comparing,
    holding: comparing && framed,
    framing,
    target: comparing ? compactTarget : undefined,
    surface,
    divider: divider / 100,
    mark,
    pick: comparing && surface && !details ? pick : undefined,
    chapter: comparing && sample !== undefined ? `velocity:${sample},${divider}` : "",
    world: comparing && grid && sample !== undefined && (
      <>
        {!!surface && framed && !details && (
          <GlacierTransect
            grid={grid}
            sample={sample}
            divider={divider}
            select={select}
            showYear={showYear}
          />
        )}
        <GlacierWorld
          grid={grid}
          sample={sample}
          divider={divider}
          ready={!!surface && framed}
          inspecting={details}
          select={select}
          pick={pick}
          adjust={moveDivider}
          inspect={inspect}
        />
      </>
    ),
    control:
      grid &&
      (comparing && sample !== undefined ? (
        <section className="glacier-comparison" aria-label="Compare ice speed">
          <div className="glacier-reading-heading">
            <h3>Ice speed</h3>
            <span>Metres per year</span>
          </div>
          <GlacierReading
            showYear={showYear}
            divider={divider}
            grid={grid}
            sample={sample}
            details={details}
            outside={outside}
            button={detailsOpener}
            back={detailsBack}
            select={select}
            inspect={() => inspect(detailsOpener.current)}
            onBack={closeDetails}
          />
          {!details && (
            <button className="glacier-trace-action" type="button" onClick={changeMode}>
              Open flow trace
            </button>
          )}
          {failed ? (
            <button type="button" onClick={failed.retry}>
              Retry matching velocity image
            </button>
          ) : (
            !surface && <p role="status">Loading both velocity maps…</p>
          )}
        </section>
      ) : (
        <div className="observatory-actions">
          <button type="button" onClick={changeMode}>
            Compare 2013 and 2024
          </button>
        </div>
      )),
  };
}
