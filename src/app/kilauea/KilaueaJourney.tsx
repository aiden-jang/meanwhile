import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { PlaybackButton } from "../PlaybackButton";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ReplayPanel, type ReplayProps } from "../observations/RecordedReplay";
import { revealReading } from "../observations/revealReading";
import { StoryDock } from "../observations/StoryDock";
import { useMedia } from "../useNarrow";
import { TimelineTrack } from "../observations/TimelineTrack";
import { drawLavaComparison, drawLavaSurface } from "./drawLava";
import { ShorelineHandle } from "./ShorelineHandle";
import { ShorelineReading } from "./ShorelineReading";
import { KilaueaFootage } from "./KilaueaFootage";
import {
  COAST_COMPARISON,
  LAST,
  OCEAN_ENTRY,
  lavaChapter,
  mapDate,
  shorelineTime,
  snapshots,
} from "./lavaTimeline";
import { smallLavaSurvey, useLavaRelief } from "./lavaRelief";
import { useStorySession } from "../observations/StorySession";
import { nearest } from "../../sources/observations/common";

import { coastalSurvey, coastHandle, coastlineDivider, fissure, lens, raster, surveyLens } from "./surveyMap";

const MOTION = "(prefers-reduced-motion: reduce)";

export function KilaueaJourney({ onView, ...panel }: ReplayProps): JSX.Element {
  const { initial, remember } = useStorySession();
  const navigation = useStoryNavigation();
  const coast = navigation?.route?.id === "reading-the-coast";
  const [index, setIndex] = useState(
    initial?.at === undefined
      ? 0
      : snapshots.indexOf(nearest(snapshots, initial.at, (snapshot) => Date.parse(snapshot.at))!),
  );
  const [split, setSplit] = useState<number | null>(
    initial?.chapter === "compare"
      ? Math.max(
          0,
          Math.min(100, Number.isFinite(Number(initial.choice)) ? Number(initial.choice) : COAST_COMPARISON),
        )
      : coast && initial?.at === undefined
        ? COAST_COMPARISON
        : null,
  );
  const [invited, setInvited] = useState(!coast && !initial);
  const [playing, setPlaying] = useState(false);
  const reduced = useMedia(MOTION);
  const [arrived, setArrived] = useState(false);
  const [footage, setFootage] = useState(false);
  const replayIndex = useRef(index);
  const playButton = useRef<HTMLButtonElement>(null);
  const timeline = useRef<HTMLInputElement>(null);
  const id = useId();
  const [surveyScale] = useState(() => (smallLavaSurvey() ? 0.5 : 1));
  const [surface] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1300 * surveyScale;
    canvas.height = 1150 * surveyScale;
    return canvas;
  });
  const relief = useLavaRelief(surveyScale < 1);
  const arrive = useCallback(() => setArrived(true), []);
  const comparing = split !== null;
  const atlas = useMemo(
    () => (comparing && relief !== undefined ? drawLavaComparison(relief, surveyScale) : null),
    [comparing, relief, surveyScale],
  );
  const target = comparing || index >= OCEAN_ENTRY ? coastalSurvey : fissure;
  const at = snapshots[comparing ? LAST : index]!.at;
  const kept =
    comparing &&
    navigation?.library.saved.some(
      (entry) =>
        entry.id === "kilauea" &&
        entry.position.moment?.chapter === "compare" &&
        entry.position.moment.choice === String(split),
    );
  useStoryCompletion(comparing || (index === LAST && !playing));
  const title = comparing
    ? "Where ocean became land."
    : invited
      ? "From fissure to sea."
      : lavaChapter(index);
  const time = split === null ? mapDate(at) : shorelineTime(split);

  useLayoutEffect(() => {
    if (!comparing && relief !== undefined) drawLavaSurface(surface, index, relief, surveyScale);
  }, [index, relief, surface, comparing, surveyScale]);

  useLayoutEffect(() => {
    onView({
      capture: !footage || panel.map,
      kind: "observation",
      frame: { at: Date.parse(at), raster },
      target,
      image: null,
      ...(relief !== undefined ? { surface: atlas ?? surface } : {}),
      ...(split !== null && atlas
        ? { surveyDivider: coastlineDivider(split), surveyHandle: { ...coastHandle, fraction: split / 100 } }
        : {}),
      lens: comparing ? surveyLens : lens,
      arrive,
    });
    remember?.({ chapter: comparing ? "compare" : "", choice: String(split ?? "") });
  }, [arrive, atlas, at, comparing, relief, footage, onView, panel.map, remember, split, surface, target]);

  useEffect(() => {
    if (!playing || !arrived || relief === undefined) return;
    let timer = 0;
    function schedule() {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        if (index < LAST) setIndex(index + 1);
        else {
          setPlaying(false);
          replayIndex.current = LAST;
          setSplit(COAST_COMPARISON);
        }
      }, 820);
    }
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [playing, arrived, index, relief]);

  useEffect(() => {
    const motion = matchMedia(MOTION);
    const stop = (event: MediaQueryListEvent) => {
      if (event.matches) setPlaying(false);
    };
    motion.addEventListener("change", stop);
    return () => motion.removeEventListener("change", stop);
  }, []);

  function inspect(next: number) {
    setInvited(false);
    setPlaying(false);
    setFootage(false);
    setSplit(null);
    setIndex(next);
  }

  function compare() {
    replayIndex.current = index;
    setInvited(false);
    setPlaying(false);
    setFootage(false);
    setSplit(COAST_COMPARISON);
    requestAnimationFrame(() => {
      timeline.current?.focus({ preventScroll: true });
      if (coast) revealReading(timeline.current);
    });
  }

  function follow() {
    if (matchMedia(MOTION).matches) {
      inspect(comparing || index === LAST || invited ? 0 : index + 1);
      requestAnimationFrame(() => timeline.current?.focus({ preventScroll: true }));
      return;
    }
    if (comparing || index === LAST) inspect(0);
    setInvited(false);
    setFootage(false);
    setPlaying((current) => !current);
    if (invited) requestAnimationFrame(() => playButton.current?.focus({ preventScroll: true }));
  }

  const scrubber = (
    <input
      id={id}
      ref={timeline}
      className="scrub-slider"
      type="range"
      min={0}
      max={comparing ? 100 : LAST}
      value={split ?? index}
      aria-valuetext={time}
      onInput={(event) => {
        const next = event.currentTarget.valueAsNumber;
        if (comparing) setSplit(next);
        else inspect(next);
      }}
    />
  );

  return (
    <ReplayPanel
      {...panel}
      onMap={(map) => {
        if (map) setFootage(false);
        panel.onMap(map);
      }}
      finding={false}
      save={!comparing}
      className={coast && comparing ? "kilauea-journey coast-survey" : "kilauea-journey"}
      title="Kīlauea"
      subtitle={coast ? "Kapoho Bay, Hawaiʻi Island · 2018" : "Hawaiʻi Island · 2018"}
      location="Lower East Rift Zone"
      status={
        footage && !panel.map
          ? "USGS overflight · June 4, 2018"
          : comparing
            ? "USGS · Registered shoreline survey"
            : arrived
              ? relief === undefined
                ? "Preparing the USGS survey"
                : "USGS · Mapped lava extent"
              : "Approaching Hawaiʻi Island"
      }
      at={
        <span>
          {comparing
            ? split === 0
              ? "Before eruption"
              : split === 100
                ? "August 9, 2018"
                : "May–August 2018"
            : time}
        </span>
      }
      inset={
        <>
          {footage && !panel.map && <KilaueaFootage />}
          {atlas && (
            <>
              <span className="kapoho-mark" data-survey-point="" aria-hidden="true" />
              <ShorelineHandle onAdjust={setSplit} />
            </>
          )}
          {atlas && arrived && split !== null && split > 0 && split < 100 && (
            <div className="kilauea-coast-labels" aria-hidden="true">
              <span>Before eruption</span>
              <span>Aug 9, 2018</span>
            </div>
          )}
        </>
      }
      sources={
        <>
          <a href="https://doi.org/10.5066/P9S7UQKQ" target="_blank" rel="noreferrer">
            USGS lava maps
          </a>
          <a
            href="https://www.usgs.gov/media/videos/kilauea-volcano-lava-entering-kapoho-bay"
            target="_blank"
            rel="noreferrer"
          >
            USGS ocean-entry footage
          </a>
        </>
      }
    >
      <div
        className="kilauea-narrative"
        data-kilauea-phase={comparing ? "compare" : invited ? "intro" : "replay"}
      >
        {!(coast && comparing) && <h3>{title}</h3>}
        {split !== null ? (
          <ShorelineReading split={split} guided={coast} onAdjust={setSplit} />
        ) : (
          <p className="observation-note">
            {invited
              ? "Follow the lava from Fissure 8 to Kapoho Bay."
              : "Amber highlights the newly mapped lava. Darker orange shows earlier flows."}
          </p>
        )}
        {coast && comparing && (
          <div className="coast-survey-control">
            <div>
              <label htmlFor={id}>Shoreline divider</label>
              <span>{split}%</span>
            </div>
            {scrubber}
          </div>
        )}
        <div className="observatory-actions kilauea-actions">
          {invited && (
            <button type="button" className="kilauea-follow" onClick={follow}>
              Follow the lava
            </button>
          )}
          {comparing ? (
            <>
              <button
                type="button"
                disabled={kept}
                className="kilauea-follow"
                onClick={() => {
                  const visit = navigation?.current();
                  if (visit) navigation?.library.save(visit);
                }}
              >
                {kept ? "Comparison kept" : "Keep this comparison"}
              </button>
              <button
                type="button"
                onClick={() => {
                  inspect(replayIndex.current);
                  requestAnimationFrame(() => timeline.current?.focus({ preventScroll: true }));
                }}
              >
                Back to replay
              </button>
            </>
          ) : (
            <button type="button" onClick={compare}>
              Compare coast
            </button>
          )}
        </div>
        {comparing && navigation?.library.notice && (
          <p className="observation-note" role="status">
            {navigation.library.notice}
          </p>
        )}
        {index === OCEAN_ENTRY && !panel.map && !comparing && (
          <div className="observatory-actions">
            <button
              type="button"
              aria-pressed={footage}
              onClick={() => {
                setPlaying(false);
                setFootage(!footage);
              }}
            >
              {footage ? "Return to lava map" : "Watch USGS overflight"}
            </button>
          </div>
        )}
        {relief === null && (
          <p className="observation-note" role="status">
            Shaded relief is unavailable. The mapped outlines are visible.
          </p>
        )}
      </div>
      {!(coast && comparing) && (
        <StoryDock label="Kīlauea playback" deferOnShortPhone={invited}>
          <div className="survey-transport" data-comparing={comparing}>
            <div className="story-dock-time">
              <label htmlFor={id}>{comparing ? "Compare before and after" : "Mapped extent date"}</label>
              <span className="story-dock-readout">{comparing ? "Drag the divider" : time}</span>
            </div>
            <TimelineTrack
              max={comparing ? 100 : LAST}
              current={split ?? index}
              landmark={
                comparing
                  ? undefined
                  : {
                      at: OCEAN_ENTRY,
                      label: `Ocean entry · ${mapDate(snapshots[OCEAN_ENTRY]!.at)}`,
                      select: () => inspect(OCEAN_ENTRY),
                    }
              }
            >
              {scrubber}
            </TimelineTrack>
            <div className="story-dock-actions">
              {!invited && (
                <PlaybackButton
                  buttonRef={playButton}
                  playing={playing}
                  ended={comparing || index === LAST}
                  startLabel={reduced ? "Next survey" : undefined}
                  onClick={() => {
                    if (matchMedia(MOTION).matches)
                      inspect(comparing || index === LAST ? 0 : Math.min(LAST, index + 1));
                    else follow();
                  }}
                />
              )}
              {!comparing && (
                <>
                  <button type="button" data-survey-milestone="" onClick={() => inspect(0)}>
                    Fissure 8
                  </button>
                  <button type="button" data-survey-milestone="" onClick={() => inspect(OCEAN_ENTRY)}>
                    Ocean entry
                  </button>
                </>
              )}
            </div>
          </div>
        </StoryDock>
      )}
    </ReplayPanel>
  );
}
