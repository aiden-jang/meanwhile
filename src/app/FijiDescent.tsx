import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { StoryOnward } from "./continuity/StoryOnward";
import { depthRecords, type DepthRecord } from "../data/depthRecords";
import type { CameraState, Controls } from "../globe/controls";
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
  map,
  setMap,
  readCamera,
  controls,
  setDepth,
  closing,
  closed,
  onBack,
  onExplore,
}: {
  depth: number;
  map: boolean;
  setMap: (map: boolean) => void;
  readCamera: () => CameraState;
  controls: Controls | undefined;
  setDepth: (depth: number) => void;
  closing: boolean;
  closed: boolean;
  onBack: () => void;
  onExplore: (record: DepthRecord) => void;
}) {
  const [resuming] = useState(depth > 0);
  const [arrived, setArrived] = useState(resuming);
  const [entryMap] = useState(map);
  const stage = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const reached = depth >= august.depthKm;
  const record = depth >= september.depthKm ? september : august;
  const gesture = useMedia("(pointer: coarse)") ? "Drag" : "Scroll";
  const scrub = useDescentScrub(depth, september.depthKm, 10, !closing && !closed, setDepth);
  useDescentWheel(stage, scrub.move);

  useLayoutEffect(() => {
    if (!controls || closed) return;
    controls.setDepthScrub(scrub.move);
    return () => controls.setDepthScrub(null);
  }, [controls, closed, scrub]);

  useLayoutEffect(() => {
    if (!closed && !resuming) back.current?.focus({ preventScroll: true });
  }, [closed, resuming]);

  useEffect(() => {
    if (closed) return;
    if (resuming) {
      stage.current?.style.setProperty("--fiji-aperture", "1");
      return;
    }
    const start = performance.now();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = 0;
    const check = (time: number) => {
      const { lon, lat, zoom } = readCamera();
      const deltaLon = Math.abs(((((lon + 176) % 360) + 540) % 360) - 180);
      const error = Math.hypot(deltaLon, lat + 18.3);
      const proximity = Math.max(0, 1 - error / 31);
      const approach = Math.max(0, Math.min(1, (zoom - 0.92) / (entryMap ? 1.36 : 0.83)));
      const elapsed = time - start;
      const fallback = (elapsed - 870) / 830;
      const amount = motion.matches ? 1 : Math.min(1, Math.max(Math.min(proximity, approach), fallback));
      visible = Math.max(visible, amount);
      stage.current?.style.setProperty("--fiji-aperture", visible.toFixed(4));
      if (visible >= 1) setArrived(true);
      else frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [closed, entryMap, readCamera, resuming]);

  return (
    <section
      ref={stage}
      className="fiji-descent"
      data-fiji-lon={august.lon}
      data-fiji-lat={august.lat}
      data-closed={closed || undefined}
      aria-hidden={closed || undefined}
      aria-label="Beneath Fiji"
      onPointerDownCapture={scrub.stop}
      onKeyDownCapture={scrub.stop}
      data-arrived={arrived || undefined}
      data-returning={closing || undefined}
      data-reached={reached || undefined}
      data-map={map || undefined}
      data-underwater={depth > 0 || undefined}
      style={{ "--fiji-progress": closing ? 0 : Math.min(1, depth / 420) } as CSSProperties}
    >
      <div className="fiji-waterline" aria-hidden="true" />
      <span className="fiji-flight-point" aria-hidden="true" />
      {!closed && (
        <div className="fiji-navigation">
          <button
            ref={back}
            type="button"
            className="fiji-back"
            onClick={onBack}
            aria-label="Back to previous view"
          >
            <span aria-hidden="true">‹</span> Back
          </button>
          <StoryProjection map={map} onMap={setMap} label="Fiji projection" />
        </div>
      )}
      <div className="fiji-title">
        <h2>Fiji</h2>
        <p>{!arrived ? "South Pacific" : depth ? "Earthquake depth" : "At the waterline"}</p>
      </div>
      {arrived && !closed && (
        <>
          <div className="fiji-depth-control">
            <div className="fiji-depth-ticks" aria-hidden="true">
              <span>0</span>
              <span>300</span>
              <span>600</span>
            </div>
            <input
              aria-label="Descend beneath the waterline"
              aria-orientation="vertical"
              aria-valuetext={depth === 0 ? "Waterline" : `${Math.round(depth)} km deep`}
              type="range"
              min={0}
              max={september.depthKm}
              step="0.1"
              value={depth}
              onChange={(event) => setDepth(event.currentTarget.valueAsNumber)}
              onKeyDown={(event) => {
                const offset: Record<string, number> = {
                  ArrowDown: 15,
                  ArrowRight: 15,
                  ArrowUp: -15,
                  ArrowLeft: -15,
                  PageDown: 100,
                  PageUp: -100,
                };
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? september.depthKm
                      : depth + (offset[event.key] ?? 0);
                if (!(event.key === "Home" || event.key === "End" || event.key in offset)) return;
                event.preventDefault();
                setDepth(Math.max(0, Math.min(september.depthKm, next)));
              }}
              disabled={closing}
            />
          </div>
          <div className="fiji-reading">
            <p className="fiji-caption">
              {depth === 0
                ? `${gesture} down to the quake`
                : depth < august.depthKm
                  ? "Depth below sea level"
                  : "Recorded earthquake"}
              <strong>
                {reached ? record.depthKm : Math.round(depth)} <small>km</small>
              </strong>
            </p>
            {reached && (
              <div className="fiji-record">
                <p>
                  {record.scale} {record.magnitude.toFixed(1)} <span>·</span>{" "}
                  {record === august ? "19 Aug 2018" : "6 Sep 2018"}
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setDepth(record === august ? september.depthKm : august.depthKm)}
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
            )}
          </div>
          {reached && (
            <span
              className="fiji-quake-mark"
              data-world-story-marker=""
              aria-hidden="true"
              data-observation-anchor=""
              data-compact-anchor=""
              data-lon={record.lon}
              data-lat={record.lat}
              data-depth-km={map ? undefined : record.depthKm}
            >
              <span>{map ? "Epicentre" : "Quake origin"}</span>
            </span>
          )}
          <small className="fiji-credit">Illustrated waterline · USGS earthquake data</small>
        </>
      )}
    </section>
  );
}
