import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { ObservationSourceNotes } from "./ObservationSourceNotes";
import { ObservationTransport } from "./ObservationTransport";
import { CoastFinding } from "../journeys/CoastFinding";
import { goldenGate } from "../journeys/coastRoute";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { WaterSourceRecord } from "../journeys/WaterSourceRecord";
import { MeasurementSound } from "../MeasurementSound";
import { PlaceComparison } from "./PlaceComparison";
import { ObservationInspection, useObservationInspection } from "./ObservationInspection";
import { FrameComparison } from "./FrameComparison";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HOUR, nearest } from "../../sources/observations/common";
import { observations, type ObservationId } from "./catalogue";
import type { ObservationFrame, ObservationSource, ObservationView } from "./types";
import { RiverReading, useRiverGauge } from "./RiverReading";
import { ObservationChart } from "./ObservationChart";
import { DeepTimePin } from "./DeepTimePin";
import { useObservationData, useObservationImage } from "./useObservationData";
import { observationReadiness } from "./observationReadiness";
import { useReportStorySource } from "./StorySourceStatus";
import { RainbeltControls } from "./RainbeltControls";
import { DrifterTrack, useDrifterTrack } from "./DrifterTrack";
import { refreshAnnotations } from "../../globe/annotationInput";
import { useStorySession } from "./StorySession";

const regionalArrival = () => {};
const EMPTY: readonly ObservationFrame[] = [];
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });

export function ObservationPlayer({
  id,
  source,
  map,
  update,
  picker,
  showingForecast = false,
  onArrival,
}: {
  id: ObservationId;
  source: ObservationSource;
  map: boolean;
  update: (view: ObservationView | null, release?: boolean) => void;
  picker?: { value: string; select: (value: string) => void };
  showingForecast?: boolean;
  onArrival?: (() => void) | undefined;
}): JSX.Element {
  const { initial, remember } = useStorySession();
  const coast = useStoryNavigation()?.route?.id === "reading-the-coast";
  const wave = coast && id === "tsunami";
  const tide = coast && id === "tide";
  const [localOption, setOption] = useState(
    initial?.choice &&
      (source.options?.some((p) => p.id === initial.choice) ||
        /^pin:-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(initial.choice))
      ? initial.choice
      : tide
        ? goldenGate.id
        : (source.options?.[0]?.id ?? ""),
  );
  const option = picker?.value ?? localOption;
  const [selectedAt, setSelectedAt] = useState<number | null>(initial?.at ?? null);
  const [playing, setPlaying] = useState(false);
  const restoreAt =
    id === "rain" || id === "river"
      ? (selectedAt ?? undefined)
      : id === "tide" && option === initial?.choice
        ? (selectedAt ?? undefined)
        : undefined;
  const { data, state, reason, retry } = useObservationData(source, option, restoreAt);
  useReportStorySource(id, state, retry);
  const frames = data?.frames ?? EMPTY;
  const seek = useCallback(
    (at: number) => {
      if (id === "drifter") refreshAnnotations({ camera: "hold" });
      setPlaying(false);
      setSelectedAt(nearest(frames, at, (value) => value.at)?.at ?? null);
    },
    [id, frames],
  );
  const drifter = useDrifterTrack(id === "drifter" ? frames : EMPTY, seek);
  const frame =
    selectedAt === null ? frames[data?.initial ?? 0] : nearest(frames, selectedAt, ({ at }) => at);
  const index = frame ? frames.indexOf(frame) : 0;
  const buoyMarks = useMemo(() => {
    if (!wave) return;
    const points = frames[0]?.marks?.flatMap((mark) => (mark.id ? [{ ...mark, id: mark.id }] : []));
    if (!points?.length) return;
    return {
      points,
      select(index: number) {
        const buoy = points[index];
        if (buoy) {
          setPlaying(false);
          setOption(buoy.id);
        }
      },
    };
  }, [frames, wave]);
  const {
    element,
    status,
    retry: retryImage,
  } = useObservationImage(
    frame?.photograph?.url ?? frame?.raster?.url,
    frame?.photograph ? option : undefined,
  );
  const time = frame ? (frame.timeLabel ?? `${clock.format(frame.at)} UTC`) : "";
  const metadata = observations[id];
  const latest = frames.at(-1);
  const holding = state !== "ready" && latest !== undefined;
  const canHold = id === "deep" || id === "swell" || coast;
  const inspection = useObservationInspection(frame);
  const inspect = inspection.pick;
  const river = useRiverGauge(frame, initial?.chapter);
  const { gauge, shown, pickMarks } = river;
  const presented = useRef<{ frame: ObservationFrame; image: HTMLImageElement | null }>();
  const readiness = observationReadiness({
    hasFrame: !!frame,
    loadingData: state === "loading",
    raster: !!frame?.raster,
    image: status,
  });
  const preparing = readiness === "preparing";
  const heldRain = id === "rain" && status === "failed" ? presented.current : undefined;
  const heldFrame = (preparing ? presented.current : heldRain)?.frame;
  const heldTime = heldFrame ? (heldFrame.timeLabel ?? `${clock.format(heldFrame.at)} UTC`) : null;
  useStoryCompletion(
    selectedAt !== null &&
      frames.length > 1 &&
      index === frames.length - 1 &&
      !playing &&
      state === "ready" &&
      readiness === "ready",
  );

  useLayoutEffect(() => {
    if (preparing) {
      if (frame && (id === "rain" || wave)) remember?.({ at: frame.at, choice: option });
      return;
    }
    if (canHold && (!data || !frame) && state === "loading") return;
    update(
      data && frame
        ? {
            kind: "observation",
            target:
              (map ? data.mapTarget : undefined) ??
              (drifter || wave ? data.target : (frame.camera ?? data.target)),
            frame: heldRain?.frame ?? shown ?? frame,
            image: heldRain?.image ?? element,
            ...(id === "air" ? { onPick: inspect, pickOnGlobe: true } : {}),
            ...(id === "river" || id === "smoke" ? { pickMarks, cameraKey: option } : {}),
            ...(drifter ? { pickMarks: drifter, cameraKey: option, arrive: regionalArrival } : {}),
            ...(id === "tide" ? { cameraKey: option } : {}),
            ...(buoyMarks ? { pickMarks: buoyMarks } : {}),
            ...(!wave && !map && playing && frame.camera ? { follow: frame.camera } : {}),
            ...(data.lens ? { lens: data.lens, arrive: onArrival ?? regionalArrival } : {}),
          }
        : null,
      (id === "rain" || tide) && !frame && (state === "empty" || state === "failed"),
    );
    if (readiness === "ready" && frame) presented.current = { frame, image: element };
    else if (!heldRain) presented.current = undefined;
    if (frame)
      remember?.({
        choice: option,
        ...(id === "rain" ? { at: frame.at } : {}),
        chapter: gauge ? `gauge:${gauge.id}` : "",
      });
  }, [
    data,
    frame,
    element,
    map,
    update,
    canHold,
    state,
    remember,
    option,
    id,
    inspect,
    playing,
    preparing,
    readiness,
    gauge,
    shown,
    pickMarks,
    drifter,
    heldRain,
    onArrival,
    wave,
    tide,
    buoyMarks,
  ]);

  useEffect(() => {
    if (!playing || status === "loading") return;
    let timer = 0;
    function step() {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(
        () => {
          const next = frames[index + 1];
          if (next) setSelectedAt(next.at);
          else setPlaying(false);
        },
        Math.max(id === "tide" ? 60 : 120, Math.min(800, 18_000 / frames.length)),
      );
    }
    step();
    document.addEventListener("visibilitychange", step);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", step);
    };
  }, [frames, id, index, playing, status]);

  return (
    <>
      {id === "rain" && (
        <WaterSourceRecord
          id="rain"
          at={readiness === "ready" ? frame?.at : heldFrame?.at}
          requestedAt={frame?.at}
          forecastVisible={showingForecast}
        />
      )}
      {initial?.at !== undefined && frame && frame.at !== initial.at && selectedAt === initial.at && (
        <p className="observation-note" role="status">
          The linked time is outside the available observations. Showing the nearest available moment.
        </p>
      )}
      {source.options && (
        <label className="observation-picker">
          <span>{metadata.picker}</span>
          <select
            value={option}
            onChange={(event) => {
              if (!canHold || tide) setSelectedAt(null);
              setPlaying(false);
              (picker?.select ?? setOption)(event.currentTarget.value);
            }}
          >
            {option.startsWith("pin:") && <option value={option}>Custom coordinates</option>}
            {source.options.map(({ id: key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {id === "deep" && (
        <DeepTimePin
          select={(value) => {
            setPlaying(false);
            setOption(value);
          }}
        />
      )}
      {id === "rain" && <RainbeltControls pause={() => setPlaying(false)} />}
      {drifter && data?.mapTarget && (
        <DrifterTrack overview={data.mapTarget} fix={frame?.camera} pause={() => setPlaying(false)} />
      )}
      {frame && data && (
        <>
          <ObservationTransport
            {...{ frame, frames, index, time, playing, seek }}
            label={id === "lightning" && frame === latest ? "Latest available scan" : metadata.time}
            sliderLabel={metadata.time}
            toggle={() => {
              if (!playing && index === frames.length - 1) setSelectedAt(frames[0]!.at);
              setPlaying(!playing);
            }}
          />
          {wave && frame.modeledArrival && (
            <p className="coast-wave-note">
              {frame.at >= frame.modeledArrival.at
                ? "Modeled front reached this buoy"
                : "Modeled front reaches this buoy"}
              {" · "}
              {(frame.modeledArrival.at - frames[0]!.at) / HOUR} h
            </p>
          )}
          {frame.measurements?.length ? (
            <dl className="observation-values">
              {frame.measurements.map(({ label, value }) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {wave && frame.modeledArrival?.sampleAt !== undefined && (
            <p className="coast-buoy-time">
              Buoy sample ·{" "}
              <time dateTime={new Date(frame.modeledArrival.sampleAt).toISOString()}>
                {clock.format(frame.modeledArrival.sampleAt)} UTC
              </time>
            </p>
          )}
          {frame.details && (
            <details className="observation-details">
              <summary>{frame.details.title}</summary>
              <dl className="observation-values">
                {frame.details.rows.map(({ label, value }, key) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          {data.series &&
            (frame.gauges ? (
              <RiverReading
                at={frame.at}
                gauges={frame.gauges}
                series={data.series}
                selection={river}
                current={state === "ready"}
                pause={() => setPlaying(false)}
                seek={seek}
              />
            ) : (
              <ObservationChart
                series={data.series}
                at={frame.at}
                units={data.units}
                tide={frame.tide}
                onSeek={drifter || wave || id === "tide" ? seek : undefined}
              />
            ))}
          {id === "air" && (
            <ObservationInspection frame={frame} inspection={inspection} source={metadata.source} />
          )}
          {(id === "air" || id === "tide") && (
            <PlaceComparison source={source} option={option} data={data} frame={frame} tide={id === "tide"} />
          )}
          <FrameComparison frames={frames} index={index} select={(next) => seek(frames[next]!.at)} />
          {id === "tide" && state === "ready" && frame.tide && (
            <MeasurementSound
              key={option}
              value={frame.tide.observed}
              min={frame.tide.min}
              max={frame.tide.max}
              label="water level"
              explanation="Higher pitch means higher measured water within this harbor’s displayed range."
            />
          )}
          {data.chapters?.length ? (
            <div className="observatory-actions observation-chapters">
              {data.chapters.map(({ index: jump, label }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => {
                    setPlaying(false);
                    setSelectedAt(frames[jump]!.at);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
      <ObservationSourceNotes
        id={id}
        state={state}
        reason={reason}
        retry={retry}
        latest={holding ? latest : undefined}
        imageStatus={status}
        retryImage={retryImage}
        heldTime={heldTime}
        heldFailure={!!heldRain}
        heldPhoto={!!frame?.photograph && !!element}
        note={data?.note}
      />
      {tide && (
        <CoastFinding
          harbor={source.options?.find(({ id }) => id === option)?.label ?? goldenGate.label}
          frame={frame}
        />
      )}
    </>
  );
}
