import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  lightsBounds,
  lightsCorners,
  lightsLens,
  lightsPeriods,
  loadBlackMarble,
  puertoRico,
} from "../../sources/observations/blackMarble";
import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { ReplayPanel, type ReplayProps } from "../observations/RecordedReplay";
import { useStorySession } from "../observations/StorySession";
import { StoryLoading } from "../StoryLoading";
import { lightsChapter, lightsCities, type LightsPlace } from "./lightsSurface";
import { LightsComparison, LightsPlaceReading, LightsSources } from "./LightsComparison";
import { LightsLensWorld } from "./LightsLensWorld";
import { LightsTimeline } from "./LightsTimeline";
import { useLightsLens } from "./useLightsLens";
import { captureReplayFrame, restoreReplayFrame } from "../observations/replayReturn";
import { refreshAnnotations } from "../../globe/annotationInput";
import { surveyComparison } from "../observations/surveyComparison";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { stormJourney } from "../journeys/stormJourney";
import { useMedia } from "../useNarrow";

const MOTION = "(prefers-reduced-motion: reduce)";
const phoneLens = { globe: 17.5, map: 42 };
const comparisonTarget = { ...puertoRico, zoom: 2.48 };
const LAST = lightsPeriods.length - 1;
const bounds = { bounds: lightsBounds, corners: lightsCorners, opacity: 1, feather: 0.045 };
const locator = [{ lon: puertoRico.lon, lat: puertoRico.lat, size: 19, color: 0xe6caa6 }];
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export function LightsReturn({ onView, ...panel }: ReplayProps): JSX.Element {
  const { initial, remember } = useStorySession();
  const guided = useStoryNavigation()?.route?.id === stormJourney;
  const openComparison = guided && initial?.choice === undefined;
  const phone = useMedia("(max-width: 599px)");
  const short = useMedia("(max-height: 700px)");
  const [usingLens, setUsingLens] = useState(
    () => initial?.chapter?.startsWith("lens:") || (!guided && !initial),
  );
  const lens = phone && (guided || (usingLens && !short)) ? phoneLens : lightsLens;
  const target = usingLens && !phone ? comparisonTarget : puertoRico;
  const recovery = useLightsLens(initial?.chapter);
  const [images, setImages] = useState<HTMLImageElement[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, retry] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [settled, setSettled] = useState(false);
  const [index, setIndex] = useState(() =>
    Math.max(
      usingLens ? 1 : 0,
      Math.min(LAST, Math.round(Number(initial?.choice ?? (openComparison ? 1 : 0)) || 0)),
    ),
  );
  const [playing, setPlaying] = useState(false);
  const [compare, setCompare] = useState(() => initial?.chapter?.startsWith("compare:") ?? openComparison);
  const [split, setSplit] = useState(() => clamp(Number(initial?.chapter?.split(":")[1] ?? 50) || 0));
  const [reading, setReading] = useState(false);
  const readingReturn = useRef<{
    frame: ReturnType<typeof captureReplayFrame>;
    index: number;
    place: LightsPlace;
  }>();
  const play = useRef<HTMLButtonElement>(null);
  const skip = useRef<HTMLButtonElement>(null);

  const period = lightsPeriods[index]!;
  const comparing = !usingLens && compare && index > 0;
  const paired = usingLens || comparing;
  const displayed = comparing && split === 100 ? lightsPeriods[0] : period;
  const surface = useMemo(
    () => (paired && images ? surveyComparison(images[0]!, images[index]!) : undefined),
    [paired, images, index],
  );
  useStoryCompletion(index === LAST && !playing);

  useEffect(() => {
    let active = true;
    void loadBlackMarble().then(
      (next) => active && setImages(next),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const ready = useCallback(() => {
    if (document.activeElement === skip.current) play.current?.focus({ preventScroll: true });
    setArrived(true);
  }, []);
  const arrive = useCallback(
    (_scale: number, reduced: boolean) => {
      if (reduced) {
        setPlaying(false);
        ready();
      }
    },
    [ready],
  );
  const framing = useMemo(
    () => ({
      map: panel.map,
      onReady() {
        setSettled(true);
        ready();
      },
    }),
    [panel.map, ready],
  );

  useLayoutEffect(() => {
    if (!images) return;
    onView({
      kind: "observation",
      frame: arrived
        ? { at: period.at, raster: { ...bounds, url: period.image }, reconstruction: true }
        : { at: period.at, marks: locator },
      target,
      image: arrived ? images[index]! : null,
      ...(arrived && surface
        ? {
            surface,
            ...(usingLens ? { surveyLens: recovery.aperture } : { surveyDivider: split / 100 }),
          }
        : {}),
      capture: arrived,
      lens,
      arrive,
      comparisonFrame: framing,
      holdGeography: settled,
    });
    remember?.({
      choice: String(index),
      chapter: usingLens ? lightsChapter(recovery.place) : comparing ? `compare:${split}` : "",
      map: panel.map,
    });
  }, [
    images,
    onView,
    period,
    index,
    comparing,
    usingLens,
    recovery.aperture,
    recovery.place,
    target,
    split,
    surface,
    arrived,
    arrive,
    framing,
    lens,
    settled,
    panel.map,
    remember,
  ]);

  useEffect(() => {
    if (!arrived || !playing || index === LAST) return;
    let timer = 0;
    const step = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(
        () => {
          setIndex(index + 1);
          if (index + 1 === LAST) setPlaying(false);
        },
        index === 0 ? 2200 : 1800,
      );
    };
    step();
    document.addEventListener("visibilitychange", step);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", step);
    };
  }, [arrived, index, playing]);

  useEffect(() => {
    const motion = matchMedia(MOTION);
    const stop = () => {
      if (motion.matches) setPlaying(false);
    };
    motion.addEventListener("change", stop);
    return () => motion.removeEventListener("change", stop);
  }, []);

  function selectPeriod(value: number) {
    setPlaying(false);
    setIndex(value);
  }

  function inspect(opener: HTMLButtonElement) {
    if (!settled) return;
    readingReturn.current = {
      frame: { ...captureReplayFrame(panel), focus: opener },
      index,
      place: recovery.place,
    };
    recovery.move(recovery.place.point);
    setReading(true);
    requestAnimationFrame(() => {
      const rail = document.getElementById("observatory-intro");
      if (rail) rail.scrollTop = 0;
      rail?.querySelector<HTMLButtonElement>(".reading-back")?.focus({ preventScroll: true });
    });
  }

  function backToComparison() {
    const prior = readingReturn.current;
    if (prior) {
      setIndex(prior.index);
      recovery.choose(prior.place);
    }
    setReading(false);
    restoreReplayFrame(prior?.frame, panel, () => null);
    readingReturn.current = undefined;
  }

  function switchMode(next: boolean) {
    setPlaying(false);
    setCompare(false);
    setIndex(next ? Math.max(index, 1) : 0);
    setUsingLens(next);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          next ? ".recovery-choices button[aria-pressed=true]" : ".lights-playback-button",
        )
        ?.focus({ preventScroll: true }),
    );
  }

  return (
    <ReplayPanel
      {...panel}
      title="Lights Return"
      location="Puerto Rico"
      subtitle={
        usingLens
          ? "Puerto Rico after Hurricane Maria"
          : "Follow the uneven return of nighttime light after Hurricane Maria."
      }
      className={
        usingLens
          ? "lights-journey recovery-study" + (reading ? " recovery-inspecting" : "")
          : "lights-journey"
      }
      closeLabel={reading ? "Back to comparison" : panel.closeLabel}
      onClose={reading ? backToComparison : panel.onClose}
      finding={!guided && !usingLens}
      sharing={!reading}
      ending={!reading}
      deferSharedView={usingLens}
      status={
        failed
          ? "NASA image unavailable"
          : !arrived
            ? "Approaching the island"
            : usingLens
              ? null
              : displayed.title
      }
      at={arrived && !usingLens ? <span>{displayed.dates}</span> : null}
      inset={
        <>
          {guided && (
            <div className="lights-exposure" data-arrived={arrived || undefined} aria-hidden="true" />
          )}
          {usingLens && !failed ? (
            <LightsLensWorld
              lens={recovery}
              period={period.title}
              ready={arrived && settled}
              reading={reading}
              inspect={inspect}
            />
          ) : arrived ? (
            <>
              <div className="lights-geography" aria-hidden="true">
                {lightsCities.map(({ id, name, lon, lat }) => (
                  <span
                    key={id}
                    data-observation-anchor=""
                    data-compact-anchor=""
                    data-lon={lon}
                    data-lat={lat}
                  >
                    {name}
                  </span>
                ))}
              </div>
              <div className="lights-key" aria-label="Relative nighttime light intensity">
                <span>Dimmer</span>
                <i aria-hidden="true" />
                <span>Brighter</span>
              </div>
            </>
          ) : null}
        </>
      }
      sources={<LightsSources />}
    >
      {!images && !failed && <StoryLoading>Loading NASA’s night-light archive…</StoryLoading>}
      {failed && (
        <div className="observatory-actions">
          <p className="observation-note" role="status" aria-label="Image loading status">
            NASA’s archived images couldn’t load.
          </p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              retry((n) => n + 1);
            }}
          >
            Retry images
          </button>
        </div>
      )}
      {images && usingLens && (
        <>
          {reading && (
            <LightsPlaceReading
              index={index}
              place={recovery.place}
              images={images}
              selectPeriod={selectPeriod}
            />
          )}
          <LightsComparison
            index={index}
            place={recovery.place}
            ready={settled}
            reading={reading}
            selectPeriod={selectPeriod}
            selectPlace={(place) => {
              if (settled) refreshAnnotations({ camera: "freeze" });
              recovery.choose(place, settled);
            }}
            inspect={inspect}
            replay={() => switchMode(false)}
          />
        </>
      )}
      {images && !usingLens && (
        <LightsTimeline
          index={index}
          arrived={arrived}
          comparing={comparing}
          playing={playing}
          split={split}
          skip={skip}
          play={play}
          ready={ready}
          seek={(value) => {
            if (!arrived) ready();
            selectPeriod(value);
            if (value === 0) setCompare(false);
          }}
          togglePlay={() => {
            if (playing) setPlaying(false);
            else {
              if (index === LAST) setIndex(0);
              setCompare(false);
              setPlaying(true);
            }
          }}
          toggleCompare={() => {
            setPlaying(false);
            setCompare(!comparing);
          }}
          changeSplit={setSplit}
          openLens={() => switchMode(true)}
        />
      )}
    </ReplayPanel>
  );
}
