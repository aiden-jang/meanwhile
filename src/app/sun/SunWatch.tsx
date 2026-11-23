import { useObservatoryEscape } from "../useObservatoryEscape";
import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animationDelta } from "../../globe/animation";
import {
  SOLAR_WIND_URL,
  XRAY_URL,
  solarWind,
  xrayFlux,
  type SpaceSample,
  type WindSample,
} from "../../sources/spaceWeather";
import { SolarReadouts } from "./SolarReadouts";
import { CHAPTERS, FLIGHT_END, solarFrame, windStreaks } from "./solarFlight";
import disk from "./solar-disk.webp?url";
import { useSpaceWeather } from "./useSpaceWeather";
import { layerTime } from "../layerTime";

const MOTION = "(prefers-reduced-motion: reduce)";
const SCRUB_STEP = 100;
type Playback = { at: number; playing: boolean; upstream?: boolean };
const WIND_VIEW = CHAPTERS[1].at;

function paint(style: CSSStyleDeclaration | undefined, at: number) {
  const { diskOpacity, windOpacity, veil, push, depart } = solarFrame(at);
  style?.setProperty("--sun-veil", String(veil));
  style?.setProperty("--solar-disk-opacity", String(diskOpacity));
  style?.setProperty("--solar-wind-opacity", String(windOpacity));
  style?.setProperty("--solar-disk-shift", `${depart * -82}%`);
  style?.setProperty("--solar-disk-scale", String(1 + push * 0.38));
  style?.setProperty("--solar-wind-shift", `${depart * 7}%`);
}

export function SunWatch({
  onClose,
  sample,
  xraySample,
  position,
  remember,
  journey,
}: {
  onClose: () => void;
  sample?: WindSample | undefined;
  xraySample?: SpaceSample | undefined;
  position?: import("../observations/storyMoment").StoryMoment | undefined;
  remember: (
    moment: import("../observations/storyMoment").StoryMoment,
    readings?: { sample: WindSample | undefined; xray: SpaceSample | undefined },
  ) => void;
  journey?: { readings: HTMLElement | null; forecastAt: number | undefined; southern: boolean } | undefined;
}): JSX.Element {
  const wind = useSpaceWeather(SOLAR_WIND_URL, solarWind);
  const xray = useSpaceWeather(XRAY_URL, xrayFlux);
  const navigation = useStoryNavigation();
  const [reduced, setReduced] = useState(() => matchMedia(MOTION).matches);
  const [view, setView] = useState<Playback>(() => {
    const at = Number(position?.chapter);
    if (Number.isFinite(at) && at >= 0 && at <= FLIGHT_END) return { at, playing: false };
    if (journey)
      return reduced ? { at: WIND_VIEW, playing: false } : { at: FLIGHT_END, playing: true, upstream: true };
    return { at: FLIGHT_END, playing: false };
  });
  const [inspecting, setInspecting] = useState<WindSample | null>(sample ?? null);
  const [reading, setReading] = useState(position?.solarReading ?? "wind");
  const [heldXray, setHeldXray] = useState(xraySample);
  const [image, setImage] = useState<"loading" | "ready" | "failed">("loading");
  const [finished, setFinished] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const clock = useRef(view);
  const transportId = useId();
  const linked = wind.points.find(({ at, source }) => at === position?.at && source === position.choice);
  const selected = inspecting ?? linked ?? wind.points.at(-1);
  const radiation = heldXray ?? xray.points.at(-1);
  useLayoutEffect(() => {
    paint(stage.current?.style, clock.current.at);
    remember(
      {
        id: "sun",
        map: false,
        chapter: String(Math.round(view.at)),
        ...(journey ? { solarReading: reading } : {}),
        ...(selected ? { at: selected.at, choice: selected.source } : {}),
      },
      { sample: selected, xray: radiation },
    );
  }, [view.at, selected, remember, reading, radiation, journey]);
  const kept = selected
    ? navigation?.library.saved.some(
        ({ position }) => position.solar?.at === selected.at && position.solar.source === selected.source,
      )
    : false;

  const update = useCallback((next: Playback) => {
    clock.current = next;
    paint(stage.current?.style, next.at);
    setView(next);
  }, []);

  useLayoutEffect(() => {
    stage.current?.parentElement?.scrollTo(0, 0);
    stage.current
      ?.querySelector<HTMLButtonElement>("button[aria-pressed=true]")
      ?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!view.playing || (image === "loading" && !view.upstream)) return;
    let previous = 0;
    let published = 0;
    let frame = 0;
    function tick(now: number) {
      const current = clock.current;
      if (!current.playing) return;
      const delta = previous ? animationDelta((now - previous) / 1000) * 1000 : 0;
      const at = current.upstream
        ? Math.max(WIND_VIEW, current.at - delta * 3)
        : Math.min(FLIGHT_END, current.at + delta);
      previous = now;
      if (current.upstream ? at <= WIND_VIEW : at >= FLIGHT_END) {
        update({ at, playing: false });
        if (!current.upstream) setFinished(true);
        return;
      }
      if (now - published >= SCRUB_STEP || solarFrame(at).leg !== solarFrame(current.at).leg) {
        update({ ...current, at });
        published = now;
      } else {
        clock.current = { ...current, at };
        paint(stage.current?.style, at);
      }
      frame = requestAnimationFrame(tick);
    }
    function visibility() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [image, update, view.playing, view.upstream]);

  useEffect(() => {
    const motion = matchMedia(MOTION);
    function change(event: MediaQueryListEvent) {
      setReduced(event.matches);
      if (event.matches && clock.current.playing)
        update({ at: clock.current.upstream ? WIND_VIEW : FLIGHT_END, playing: false });
    }
    motion.addEventListener("change", change);
    return () => motion.removeEventListener("change", change);
  }, [update]);

  const { leg } = solarFrame(view.at);
  useStoryCompletion(finished);
  useObservatoryEscape(onClose);
  const caption =
    leg === "sun"
      ? image === "loading"
        ? "Loading archive image…"
        : image === "failed"
          ? "Solar image unavailable"
          : "NASA SDO archive · 10 Sep 2025"
      : leg === "wind"
        ? "Solar wind · schematic view"
        : "Earth · After Dark";

  function toggle() {
    const { at, playing } = clock.current;
    update({ at: !playing && at === FLIGHT_END ? 0 : at, playing: !playing });
  }

  const readings = (
    <div
      className="sun-console"
      role={journey ? "region" : undefined}
      aria-label={journey ? "Sun Watch readings" : undefined}
    >
      {journey ? (
        <>
          <div className="sun-transport aurora-sun-readings" role="group" aria-label="Solar measurements">
            {(["wind", "xray"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={reading === item}
                onClick={() => {
                  if (reading === item) return;
                  setReading(item);
                  if (item === "xray") setHeldXray(xray.points.at(-1));
                  update({ at: item === "wind" ? WIND_VIEW : 0, playing: false });
                }}
              >
                {item === "wind" ? "Solar wind" : "GOES X-rays"}
              </button>
            ))}
          </div>
          {journey.forecastAt !== undefined && (
            <p className="aurora-held-time">
              {journey.southern ? "Southern" : "Northern"} oval forecast valid for{" "}
              <time dateTime={new Date(journey.forecastAt).toISOString()}>
                {layerTime(journey.forecastAt)}
              </time>
            </p>
          )}
        </>
      ) : (
        <div className="sun-transport">
          <div className="sun-chapters" role="group" aria-label="Sun Watch views">
            {CHAPTERS.map(({ id, label, at }) => (
              <button
                key={id}
                type="button"
                aria-pressed={leg === id}
                onClick={() => update({ at, playing: false })}
              >
                {label}
              </button>
            ))}
          </div>
          {!reduced && (
            <button
              type="button"
              onClick={toggle}
              disabled={image === "loading"}
              data-story-playing={view.playing || undefined}
            >
              {view.playing
                ? "Pause"
                : view.at < FLIGHT_END
                  ? "Play"
                  : finished
                    ? "Replay"
                    : "Start solar flight"}
            </button>
          )}
        </div>
      )}
      {!journey && !reduced && (view.at < FLIGHT_END || finished) && (
        <div className="sun-flight-timeline">
          <label htmlFor={transportId}>Flight time</label>
          <input
            id={transportId}
            type="range"
            min={0}
            max={FLIGHT_END}
            step={SCRUB_STEP}
            className="scrub-slider"
            value={Math.round(view.at / SCRUB_STEP) * SCRUB_STEP}
            aria-valuetext={`${(view.at / 1000).toFixed(1)} seconds`}
            onChange={(event) => update({ at: event.currentTarget.valueAsNumber, playing: false })}
          />
        </div>
      )}
      <SolarReadouts
        wind={wind}
        xray={xray}
        inspecting={inspecting}
        onInspect={setInspecting}
        selected={journey ? reading : undefined}
        heldXray={heldXray}
      >
        {selected && navigation && (
          <button
            className="sun-keep"
            type="button"
            disabled={kept}
            onClick={() => {
              const visit = navigation.current();
              if (!visit) return;
              setInspecting(selected);
              navigation.library.save({ ...visit, position: { ...visit.position, solar: selected } });
            }}
          >
            {kept ? "Reading kept" : "Keep this reading"}
          </button>
        )}
      </SolarReadouts>
    </div>
  );
  return (
    <div
      ref={stage}
      className="observatory-stage sun-watch-stage"
      data-leg={leg}
      data-guided-solar={journey ? "" : undefined}
      data-upstream={view.upstream || undefined}
      role={journey ? "group" : "region"}
      aria-label={journey ? "Solar wind flight" : "Sun Watch readings"}
    >
      <div className="sun-flight">
        <div className="sun-flight-plate" aria-hidden="true">
          <img
            className="sun-archive-disk"
            src={disk}
            alt=""
            onLoad={() => setImage("ready")}
            onError={() => setImage("failed")}
            hidden={image === "failed"}
          />
          <svg className="sun-wind-passage" viewBox="0 0 800 340" preserveAspectRatio="xMidYMid slice">
            {windStreaks.map(({ path, opacity }) => (
              <path key={path} d={path} opacity={opacity} />
            ))}
          </svg>
        </div>
        <p className="sun-flight-caption">{caption}</p>
        {position?.at !== undefined && wind.points.length > 0 && !linked && !inspecting && (
          <p className="observation-note" role="status">
            The linked solar-wind reading has expired. Showing the latest available reading.
          </p>
        )}
        {view.upstream && (
          <button
            type="button"
            className="sun-skip-upstream"
            onClick={() => update({ at: WIND_VIEW, playing: false })}
          >
            Skip flight
          </button>
        )}
      </div>
      {journey ? journey.readings && createPortal(readings, journey.readings) : readings}
    </div>
  );
}
