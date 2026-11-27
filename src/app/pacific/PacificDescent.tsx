import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, RefObject } from "react";
import type { StoryMoment } from "../observations/storyMoment";
import type { WorldSubject } from "../continuity/worldSubject";
import { PacificProfile } from "./PacificProfile";
import { PacificSection } from "./PacificSection";
import { attachPacificCast } from "./pacificCamera";
import { StoryProjection } from "../observations/StoryProjection";
import { descentDrag } from "../../globe/descentInput";
import { useDescentScrub, useDescentWheel } from "../useDescentScrub";
import { useMedia } from "../useNarrow";
import {
  alohaStation,
  castAt,
  pacificId,
  pacificTitle,
  underwaterStart,
  type PacificPosition,
} from "./pacificMoment";
import type { CameraState } from "../../globe/controls";
import type { PassageCamera } from "../tonga/passageSurface";
import { alohaReading, clamp, ease, mix } from "./aloha";
const stops = [
  { name: "Orbit", position: 0 },
  { name: "Waterline", position: 435 },
  { name: "Deep ocean", position: 754 },
  { name: "Seafloor", position: 1000 },
];

export function PacificDescent({
  origin,
  originMap,
  map,
  onMap,
  onReturnMap,
  world,
  onBack,
  initial,
  current,
  onProgress,
  onSurface,
}: {
  origin: CameraState;
  originMap: boolean;
  map: boolean;
  onMap: (map: boolean) => void;
  onReturnMap: (map: boolean) => void;
  world: RefObject<PassageCamera>;
  onBack: () => void;
  initial: PacificPosition;
  current: () => StoryMoment | undefined;
  onProgress: (position: PacificPosition) => void;
  onSurface: (subject: WorldSubject, opener: HTMLElement) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const profile = useRef<HTMLButtonElement>(null);
  const closeProfile = useRef<HTMLButtonElement>(null);
  const motionFrame = useRef(0);
  const cast = useRef<ReturnType<typeof attachPacificCast> | null>(null);
  const livePosition = useRef(initial.position);
  const exiting = useRef<"back" | "surface">();
  const gesture = useRef<{ id: number; y: number; start: number; height: number } | null>(null);
  const [position, setPosition] = useState(initial.position);
  const [exit, setExit] = useState<"back" | "surface">();
  const [profileOpen, setProfileOpen] = useState(initial.profile);
  const returning = exit !== undefined;
  const gestureVerb = useMedia("(pointer: coarse)") ? "Drag" : "Scroll";
  const scrub = useDescentScrub(position, 1000, 1, !returning, seek);
  useDescentWheel(dialog, scrub.move, () => {
    if (!exiting.current) cancelAnimationFrame(motionFrame.current);
  });
  const p = position / 1000;
  const under = position >= underwaterStart;
  const region =
    p < 0.15
      ? "Orbit"
      : p < 0.392
        ? "Pacific approach"
        : !under
          ? "Waterline"
          : p < 0.91
            ? "Deep ocean"
            : "Seafloor";
  const { reading, depth } = alohaReading(position);
  const valueText = under ? `${depth} m below sea level` : region;
  const visuals = {
    "--pacific-title-rise": ease(0.04, 0.39, p),
    "--pacific-address": ease(0.12, 0.41, p),
  } as CSSProperties;

  useLayoutEffect(() => {
    const node = dialog.current;
    node?.showModal();
    if (initial.profile) closeProfile.current?.focus({ preventScroll: true });
    else back.current?.focus({ preventScroll: true });
    if (node && world.current) {
      cast.current = attachPacificCast(world.current, node, origin);
      cast.current.seek(initial.position);
    }
    return () => {
      cancelAnimationFrame(motionFrame.current);
      cast.current?.dispose();
      cast.current = null;
      node?.close();
    };
  }, [initial, origin, world]);

  function seek(next: number) {
    livePosition.current = Math.round(clamp(next / 1000) * 1000);
    setPosition(livePosition.current);
    const profile = next >= underwaterStart && profileOpen;
    if (!exiting.current) onProgress({ position: livePosition.current, profile });
    if (next < underwaterStart && !exiting.current) setProfileOpen(false);
    cast.current?.seek(livePosition.current);
  }

  function animateTo(target: number, done?: () => void) {
    cancelAnimationFrame(motionFrame.current);
    const start = livePosition.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || start === target) {
      seek(target);
      done?.();
      return;
    }
    const duration = 480 + Math.abs(target - start) * (done ? 1.2 : 0.68);
    const first = performance.now();
    const tick = (now: number) => {
      const t = clamp((now - first) / duration);
      seek(mix(start, target, t * t * (3 - 2 * t)));
      if (t === 1) done?.();
      else motionFrame.current = requestAnimationFrame(tick);
    };
    motionFrame.current = requestAnimationFrame(tick);
  }

  function returnToGlobe() {
    if (exiting.current) return;
    exiting.current = "back";
    setExit("back");
    if (map !== originMap) onReturnMap(originMap);
    setProfileOpen(false);
    animateTo(0, onBack);
  }

  function surface(opener: HTMLElement) {
    if (exiting.current || !world.current) return;
    exiting.current = "surface";
    setExit("surface");
    cast.current?.surface();
    const subject: WorldSubject = {
      point: alohaStation,
      from: pacificTitle,
      storyId: pacificId,
      layer: "wind",
      stories: ["float", "drifter"],
      zoom: 1.85,
      reading: {
        label: "Recorded profile",
        value: `${reading[1]!.toFixed(2)} °C · ${depth} m`,
        at: castAt,
        precision: "date",
      },
    };
    animateTo(0, () => onSurface(subject, opener));
  }

  function dismissProfile() {
    setProfileOpen(false);
    onProgress({ position: livePosition.current, profile: false });
    requestAnimationFrame(() => profile.current?.focus());
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const held = gesture.current;
    if (!held || held.id !== event.pointerId || returning) return;
    seek(held.start + descentDrag(event.clientY - held.y, held.height) * 1000);
  }
  function release(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id === event.pointerId) gesture.current = null;
  }

  return (
    <dialog
      ref={dialog}
      className="pacific-preview"
      aria-labelledby="pacific-title"
      data-region={region}
      data-returning={returning || undefined}
      style={visuals}
      onPointerDownCapture={scrub.stop}
      onKeyDownCapture={scrub.stop}
      onCancel={(event) => {
        event.preventDefault();
        if (profileOpen) {
          dismissProfile();
        } else returnToGlobe();
      }}
    >
      <PacificSection />
      <div
        className="pacific-gesture"
        aria-hidden="true"
        onPointerDown={(event) => {
          if (returning || event.button !== 0 || !event.isPrimary) return;
          cancelAnimationFrame(motionFrame.current);
          const height = event.currentTarget.getBoundingClientRect().height;
          gesture.current = {
            id: event.pointerId,
            y: event.clientY,
            start: livePosition.current,
            height,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      />
      <button
        type="button"
        className="pacific-back"
        ref={back}
        aria-disabled={returning || undefined}
        onClick={returnToGlobe}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
          <path d="m11 5-5 5 5 5m-5-5h10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Back
      </button>
      <StoryProjection
        map={map}
        label="Pacific projection"
        onMap={(next) => {
          if (!returning) onMap(next);
        }}
      />
      <div className="pacific-title">
        <h2 id="pacific-title">
          Through the
          <br />
          Pacific
        </h2>
        <p>22°45′ N, 158° W</p>
      </div>
      {p >= 0.15 && (
        <div className="pacific-reading">
          <p className="pacific-region">{position === 1000 ? "Deepest sample" : region}</p>
          {under ? (
            <p className="pacific-depth">
              {depth}
              <small>m</small>
            </p>
          ) : null}
          {under ? (
            <button
              type="button"
              ref={profile}
              className="pacific-profile-button"
              aria-expanded={profileOpen}
              onClick={() => {
                if (returning) return;
                setProfileOpen(!profileOpen);
                onProgress({ position: livePosition.current, profile: !profileOpen });
                if (!profileOpen) requestAnimationFrame(() => closeProfile.current?.focus());
              }}
            >
              Recorded profile
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2 15h16M3 12l4-1 2-5 4-2 4-1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          ) : null}
        </div>
      )}
      {profileOpen && (
        <PacificProfile
          reading={reading}
          depth={depth}
          close={closeProfile}
          current={current}
          onClose={dismissProfile}
          onSurface={(event) => surface(event.currentTarget)}
        />
      )}
      <footer className="pacific-controls">
        <div className="pacific-controls-heading">
          <label htmlFor="pacific-depth">
            {exit === "surface"
              ? "Surfacing at Station ALOHA"
              : returning
                ? "Returning to your globe"
                : position === 0
                  ? `${gestureVerb} down to descend`
                  : position === 1000
                    ? `${gestureVerb} up to ascend`
                    : `${gestureVerb} to change depth`}
          </label>
          <span data-depth-scale="" hidden={!under}>
            Depth scale
          </span>
        </div>
        <input
          id="pacific-depth"
          aria-label="Descent position"
          aria-valuetext={valueText}
          type="range"
          min="0"
          max="1000"
          value={position}
          disabled={returning}
          onInput={(event) => {
            cancelAnimationFrame(motionFrame.current);
            seek(event.currentTarget.valueAsNumber);
          }}
        />
        <div className="pacific-stops">
          {stops.map((stop) => (
            <button
              key={stop.name}
              type="button"
              disabled={returning}
              onClick={() => animateTo(stop.position)}
            >
              {stop.name}
            </button>
          ))}
        </div>
      </footer>
    </dialog>
  );
}
