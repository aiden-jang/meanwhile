import { useMemo, useRef } from "react";
import type { ReplayProps } from "../observations/RecordedReplay";
import { captureReplayFrame, restoreReplayFrame } from "../observations/replayReturn";
import type { StorySite } from "./types";
import type { useStoryClock } from "./useStoryClock";

export type FaultMode = "survey" | "replay" | "radar";

const surveyDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export function FaultComparison({
  sites,
  selected,
  index,
  clock,
  mode,
  onMode,
  chooseSite,
  scan,
  ...panel
}: Pick<ReplayProps, "map" | "onMap" | "readCamera" | "restoreCamera"> & {
  sites: readonly StorySite[];
  selected: StorySite | undefined;
  index: number;
  clock: ReturnType<typeof useStoryClock>;
  mode: FaultMode;
  onMode: (mode: FaultMode) => void;
  chooseSite: (id: string) => void;
  scan: "ready" | "loading" | "failed";
}) {
  const ordered = useMemo(() => [...sites].sort((a, b) => b.lat - a.lat), [sites]);
  const trigger = useRef<HTMLButtonElement>(null);
  const previous = useRef<{
    frame: ReturnType<typeof captureReplayFrame>;
    position: number;
    mode: FaultMode;
  }>();
  const active = selected ? ordered.indexOf(selected) : -1;
  const radar = index === 2;
  const replaying = mode === "replay";

  function toggleRadar() {
    if (!radar) {
      previous.current = { frame: captureReplayFrame(panel), position: clock.position, mode };
      onMode("radar");
      clock.seek(2);
      return;
    }
    const held = previous.current;
    previous.current = undefined;
    clock.seek(held?.position ?? 1);
    onMode(held?.mode ?? "survey");
    if (held) restoreReplayFrame(held.frame, panel, () => trigger.current);
  }

  function toggleReplay() {
    if (replaying) {
      clock.seek(Math.min(index, 1));
      onMode("survey");
    } else {
      onMode("replay");
      clock.playFrom(0);
    }
  }

  return (
    <section className="fault-survey" aria-label="Ridgecrest field readings">
      <div className="fault-site-reading">
        <h3>{radar ? "Radar displacement" : (selected?.measurement ?? "Survey measurements")}</h3>
        {selected && (
          <p>
            {selected.label}
            {radar && " pinned"}
          </p>
        )}
        {radar ? (
          <p>ALOS-2 · 8 Jul 2019</p>
        ) : (
          selected && <p>USGS field survey · {surveyDate.format(new Date(selected.observed))}</p>
        )}
      </div>
      {radar ? (
        <p className="fault-scan-note" role="status">
          {scan === "ready"
            ? "One color cycle shows 11.45 cm of change along the satellite’s line of sight."
            : scan === "failed"
              ? "The satellite scan couldn’t load. You can return to the survey or retry below."
              : "Loading the archived satellite scan…"}
        </p>
      ) : (
        <div className="fault-scrub">
          <div className="fault-axis">
            <label htmlFor="fault-site-scrub">Scrub survey sites</label>
            <span>{active < 0 ? `${ordered.length} sites` : `${active + 1} / ${ordered.length}`}</span>
          </div>
          <div className="fault-track">
            <div className="fault-stops" aria-hidden="true">
              {ordered.map(({ id }, stop) => (
                <i key={id} data-current={stop === active || undefined} />
              ))}
            </div>
            <input
              id="fault-site-scrub"
              type="range"
              min={0}
              max={ordered.length - 1}
              value={Math.max(0, active)}
              aria-valuetext={
                selected ? `${selected.label}, ${selected.measurement}` : "Choose a survey site"
              }
              onInput={(event) => {
                const site = ordered[event.currentTarget.valueAsNumber];
                if (site) chooseSite(site.id);
              }}
            />
          </div>
          <div className="fault-axis" aria-hidden="true">
            <span>North</span>
            <span>South</span>
          </div>
        </div>
      )}
      <div className="observatory-actions fault-actions">
        <button type="button" ref={trigger} onClick={toggleRadar}>
          {radar ? "Back to survey" : "Compare radar"}
        </button>
        {!radar && (
          <button type="button" aria-expanded={replaying} onClick={toggleReplay}>
            {replaying ? "Hide replay" : "Replay sequence"}
          </button>
        )}
      </div>
    </section>
  );
}
