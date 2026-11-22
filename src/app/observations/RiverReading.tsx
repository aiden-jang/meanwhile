import { useCallback, useMemo, useEffect, useState } from "react";
import { WaterSourceRecord } from "../journeys/WaterSourceRecord";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { savedVisitKey } from "../visitor/library";
import { ObservationChart } from "./ObservationChart";
import { discharge, gaugeUrl, riverUnit } from "./riverGauges";
import riverReaches from "../../sources/observations/river-reaches.json";
import type { ObservationFrame, ObservationSeries, ObservationView, RiverGaugeReading } from "./types";

export function useRiverGauge(frame: ObservationFrame | undefined, chapter: string | undefined) {
  const [selected, select] = useState(chapter?.startsWith("gauge:") ? chapter.slice(6) : undefined);
  const [preview, setPreview] = useState<string>();
  const gauges = frame?.gauges;
  const gauge =
    gauges?.find(({ id }) => id === selected) ??
    gauges?.find(({ value }) => value !== undefined) ??
    gauges?.find(({ available }) => available);
  useEffect(() => {
    if (!selected && gauge?.value !== undefined) select(gauge.id);
  }, [gauge, selected]);
  const active =
    preview && gauges?.some(({ id, available }) => id === preview && available) ? preview : gauge?.id;
  const shown = useMemo(() => {
    if (!frame?.gauges || !frame.marks) return frame;
    return {
      ...frame,
      marks: frame.marks.map((mark) => {
        const reading = mark.id === active ? gauges?.find(({ id }) => id === active) : undefined;
        if (!reading) return mark;
        return {
          ...mark,
          size: 20,
          color: reading.value === undefined ? 0xc4ccd6 : 0x8ae7ef,
          reading: {
            label: reading.label,
            value: reading.value === undefined ? "No reading at this time" : discharge(reading.value),
          },
        };
      }),
    } satisfies ObservationFrame;
  }, [frame, gauges, active]);
  const marks = frame?.gauges ? frame.marks : undefined;
  const selectMark = useCallback(
    (index: number) => {
      select(marks?.[index]?.id);
      setPreview(undefined);
    },
    [marks],
  );
  const pickMarks = useMemo<ObservationView["pickMarks"]>(
    () => (marks ? { points: marks, select: selectMark } : undefined),
    [marks, selectMark],
  );
  return { gauge, active, shown, pickMarks, select, setPreview };
}

export function RiverWorldReading({ frame }: { frame: ObservationFrame | undefined }) {
  const mark = frame?.marks?.find(({ reading }) => reading);
  if (!mark?.reading) return null;
  return (
    <span
      className="river-world-reading"
      data-observation-anchor=""
      data-lon={mark.lon}
      data-lat={mark.lat}
      aria-hidden="true"
    >
      <span>{mark.reading.label}</span>
      <strong>{mark.reading.value}</strong>
    </span>
  );
}

export function RiverReading({
  at,
  gauges,
  series,
  selection,
  current,
  pause,
  seek,
}: {
  at: number;
  gauges: readonly RiverGaugeReading[];
  series: readonly ObservationSeries[];
  selection: ReturnType<typeof useRiverGauge>;
  current: boolean;
  pause: () => void;
  seek: (at: number) => void;
}) {
  const navigation = useStoryNavigation();
  const { gauge, active, select, setPreview } = selection;
  const sample = gauge?.value;
  const [attempted, setAttempted] = useState("");
  const key = gauge ? `river:${gauge.id}:${at}` : "";
  const kept = navigation?.library.saved.some((visit) => savedVisitKey(visit) === key);
  return (
    <>
      <WaterSourceRecord id="river" at={at} />
      <div className="river-gauges" role="group" aria-label="River gauges">
        {gauges.map(({ id, label, value, available }, index) => (
          <button
            key={id}
            type="button"
            disabled={!available}
            aria-pressed={gauge?.id === id}
            data-highlighted={active === id || undefined}
            data-secondary={index === 1 || undefined}
            onFocus={() => setPreview(id)}
            onBlur={() => setPreview(undefined)}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setPreview(id);
            }}
            onPointerLeave={() => setPreview(undefined)}
            onClick={() => {
              select(id);
              setPreview(undefined);
            }}
          >
            <span className="chart-swatch" aria-hidden="true" />
            <span>{label}</span>
            <strong>
              {value === undefined ? (available ? "No reading" : "Unavailable") : discharge(value)}
            </strong>
          </button>
        ))}
      </div>
      <ObservationChart series={series} at={at} units={riverUnit} station={active} river onSeek={seek} />
      {gauge && (
        <div className="river-reading">
          <button
            type="button"
            disabled={!current || sample === undefined || !navigation}
            aria-disabled={kept || undefined}
            onClick={() => {
              const visit = navigation?.current();
              const moment = visit?.position.moment;
              if (!navigation || !visit || !moment || sample === undefined || kept) return;
              pause();
              setAttempted(key);
              void navigation.library.save({
                ...visit,
                position: {
                  ...visit.position,
                  moment: { ...moment, at, chapter: `gauge:${gauge.id}` },
                  river: { gauge: gauge.id, at, value: sample },
                },
              });
            }}
          >
            {kept ? "Reading kept" : "Keep reading"}
          </button>
          <a href={gaugeUrl(gauge.id)} target="_blank" rel="noreferrer">
            USGS · {gauge.label}
          </a>
          {attempted === key && <span role="status">{navigation?.library.notice}</span>}
        </div>
      )}
      <small className="observation-note">
        River outline ·{" "}
        <a href={riverReaches.source} target="_blank" rel="noreferrer">
          Natural Earth
        </a>
      </small>
    </>
  );
}
