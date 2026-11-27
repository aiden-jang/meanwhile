import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { StoryOnward } from "./continuity/StoryOnward";
import { depthRecords, type DepthRecord } from "../data/depthRecords";
import { FijiSection } from "./FijiSection";
import type { Controls } from "../globe/controls";
import { useDescentScrub, useDescentWheel } from "./useDescentScrub";
import { useMedia } from "./useNarrow";
import { StoryProjection } from "./observations/StoryProjection";
import "./fiji-descent.css";

const august = depthRecords[0];
const september = depthRecords[1];

const recordUrl = (id: string) => `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`;

export function FijiLocator({ onOpen }: { onOpen: (opener: HTMLElement) => void }) {
  return (
    <button
      id="fiji-locator"
      className="fiji-locator"
      data-fiji-locator=""
      data-observation-anchor=""
      data-compact-anchor=""
      data-lon={august.lon}
      data-lat={august.lat}
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      aria-label="Descend beneath Fiji"
    >
      <i aria-hidden="true" />
      <span>Beneath Fiji</span>
    </button>
  );
}

export function FijiDescent({
  depth,
  displayDepth,
  map,
  setMap,
  controls,
  setDepth,
  closing,
  onBack,
  onExplore,
}: {
  depth: number;
  displayDepth: number;
  map: boolean;
  setMap: (map: boolean) => void;
  controls: Controls | undefined;
  setDepth: (depth: number) => void;
  closing: boolean;
  onBack: () => void;
  onExplore: (record: DepthRecord) => void;
}) {
  const stage = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const [resumed] = useState(depth > 0);
  const [ready, setReady] = useState(resumed);
  const [notes, setNotes] = useState(false);
  const reached = depth >= august.depthKm;
  const record = depth >= september.depthKm ? september : august;
  const directTouch = useMedia("(pointer: coarse)");
  const scrub = useDescentScrub(depth, september.depthKm, 10, !closing, setDepth);
  useDescentWheel(stage, scrub.move);

  useLayoutEffect(() => {
    if (!controls) return;
    controls.setDepthScrub(scrub.move);
    return () => controls.setDepthScrub(null);
  }, [controls, scrub]);

  useLayoutEffect(() => {
    if (!resumed) back.current?.focus({ preventScroll: true });
  }, [resumed]);

  useEffect(() => {
    if (ready || !controls) return;
    let frame = 0;
    const check = () => {
      if (controls.framingReady()) setReady(true);
      else frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [controls, ready]);

  const depthText = depth === september.depthKm ? "670.8" : String(Math.floor(depth));
  const jump = (target: number) => {
    scrub.stop();
    scrub.move((target - depth) / september.depthKm, "wheel");
  };

  return (
    <section
      ref={stage}
      className="fiji-descent"
      aria-label="Beneath Fiji"
      data-fiji-lon={august.lon}
      data-fiji-lat={august.lat}
      data-arrived={ready || undefined}
      data-returning={closing || undefined}
      data-map={map || undefined}
      data-reached={reached || undefined}
      onPointerDownCapture={scrub.stop}
      onKeyDownCapture={scrub.stop}
      style={{ "--fiji-fraction": depth / september.depthKm } as CSSProperties}
    >
      <FijiSection depth={displayDepth} onSelectDepth={jump} onScrub={scrub.move} />
      <div className="fiji-navigation">
        <button
          ref={back}
          type="button"
          className="fiji-back"
          onClick={onBack}
          aria-label="Back to previous view"
        >
          <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
            <path d="m11.5 4.5-5.5 5.5 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Back
        </button>
        <StoryProjection map={map} onMap={setMap} label="Fiji projection" />
      </div>
      <div className="fiji-title">
        <h2>Beneath Fiji</h2>
        <p>Two deep earthquakes, 2018</p>
      </div>
      <div className="fiji-depth-control">
        <span aria-hidden="true">0</span>
        <input
          aria-label="Descend beneath the waterline"
          aria-orientation="vertical"
          aria-valuetext={depth === 0 ? "Sea level" : `${depth} kilometres below sea level`}
          type="range"
          min={0}
          max={september.depthKm}
          step="0.1"
          value={depth}
          disabled={closing}
          onChange={(event) => setDepth(event.currentTarget.valueAsNumber)}
          onKeyDown={(event) => {
            const offsets: Record<string, number> = {
              ArrowDown: 15,
              ArrowRight: 15,
              ArrowUp: -15,
              ArrowLeft: -15,
              PageDown: 100,
              PageUp: -100,
            };
            const key = event.key;
            if (!(key === "Home" || key === "End" || key in offsets)) return;
            event.preventDefault();
            const next = key === "Home" ? 0 : key === "End" ? september.depthKm : depth + offsets[key]!;
            setDepth(Math.max(0, Math.min(september.depthKm, next)));
          }}
        />
        <span aria-hidden="true">670.8</span>
      </div>
      <div className="fiji-reading">
        <p className="fiji-caption">
          <span>{depth === 0 ? "Sea level" : "Below sea level"}</span>
          <strong>
            {depthText}
            <small>km</small>
          </strong>
        </p>
        {reached ? (
          <div className="fiji-record">
            <p>
              {record.scale} {record.magnitude.toFixed(1)} <span>·</span>{" "}
              {depth > record.depthKm
                ? `crossed at ${record.depthKm} km`
                : record === august
                  ? "19 August 2018"
                  : "6 September 2018"}
            </p>
            <div className="fiji-record-actions">
              <button
                type="button"
                onClick={() => jump(record === august ? september.depthKm : august.depthKm)}
              >
                {record === august ? "September quake" : "August quake"}
              </button>
              <a href={recordUrl(record.id)} target="_blank" rel="noreferrer">
                USGS record
              </a>
            </div>
            <StoryOnward
              id="fiji-explore-nearby"
              label="Explore nearby earthquakes"
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                onExplore(record);
              }}
            />
          </div>
        ) : (
          <p className="fiji-invitation">
            {depth === 0
              ? directTouch
                ? "Drag down to open the section"
                : "Scroll down to open the section"
              : "August quake at 600 km"}
          </p>
        )}
      </div>
      <div className="fiji-credit">
        <button
          type="button"
          aria-expanded={notes}
          aria-controls="fiji-method"
          onClick={() => setNotes(!notes)}
        >
          Section notes
        </button>
        <div id="fiji-method" hidden={!notes} data-descent-reading="">
          <p>
            The section runs 900 km through the two 2018 USGS quake origins. The smaller points are recorded
            earthquakes within 100 km of either side, projected onto the section.
          </p>
          <p>
            The background catalogue includes USGS M4.5+ events at least 300 km deep, August 2020 to August
            2025. Surface relief comes from{" "}
            <a href="/fiji/relief-source.txt" target="_blank" rel="noreferrer">
              GEBCO 2026
            </a>
            .
          </p>
          <p>
            Displayed vertical scale <span data-section-ratio="">section closed</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
