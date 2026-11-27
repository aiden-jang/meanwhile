import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, RefObject } from "react";
import type { CameraState } from "../../globe/controls";
import type { PassageCamera } from "../tonga/passageSurface";
import {
  clamp,
  deepestPressure,
  depthAtPressure,
  ease,
  formatReading,
  mix,
  profileLine,
  profilePoint,
  readingAt,
  source,
  station,
} from "./aloha";
import approach from "./approach.webp";
import water from "./water.webp";
import floor from "./floor.webp";
import instrument from "./ctd.webp";
import "./pacific.css";

export async function preparePacificArt() {
  await Promise.all([
    ...[approach, water, floor, instrument].map((url) => {
      const image = new Image();
      image.src = url;
      return image.decode();
    }),
    document.fonts.load('400 80px "Instrument Serif"'),
  ]);
}

const stops = [
  { name: "Orbit", position: 0 },
  { name: "Waterline", position: 435 },
  { name: "Deep ocean", position: 754 },
  { name: "Seafloor", position: 1000 },
];

function paintCamera(world: PassageCamera | null, origin: CameraState, progress: number) {
  if (!world) return;
  const route = ease(0, 0.26, progress);
  const approach = ease(0, 0.36, progress);
  const longitude = ((((station.lon - origin.lon) % 360) + 540) % 360) - 180;
  world.controls.setView(
    progress === 0
      ? origin
      : {
          lon: origin.lon + longitude * route,
          lat: mix(origin.lat, station.lat, route),
          zoom: origin.zoom * (Math.max(origin.zoom, 5.6) / origin.zoom) ** approach,
        },
  );
  world.wake();
}

function Profile({ reading }: { reading: number[] }) {
  const [pressure, temperature] = reading;
  const [x, y] = profilePoint(pressure, temperature);
  return (
    <>
      <p className="pacific-sample">
        {temperature.toFixed(2)} °C <span>at {formatReading.format(pressure)} dbar</span>
      </p>
      <svg
        viewBox="0 0 288 180"
        role="img"
        aria-label="Water cools as the cast descends. Temperature in degrees Celsius, pressure in decibars."
      >
        <g className="pacific-grid">
          {[0, 10, 20].map((tick) => (
            <text key={tick} x={profilePoint(0, tick)[0]} y="15">
              {tick}°
            </text>
          ))}
          {[0, 1000, 2000, 3000, deepestPressure].map((tick) => {
            const [, height] = profilePoint(tick, 0);
            return (
              <g key={tick}>
                <text x="0" y={height + 4}>
                  {tick === deepestPressure ? "4.8k" : tick ? tick / 1000 + "k" : "0"}
                </text>
                <path d={`M46 ${height}H278`} />
              </g>
            );
          })}
        </g>
        <polyline points={profileLine} fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx={x} cy={y} r="4" fill="currentColor" />
      </svg>
    </>
  );
}

export function PacificDescent({
  origin,
  world,
  onBack,
}: {
  origin: CameraState;
  world: RefObject<PassageCamera>;
  onBack: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const profile = useRef<HTMLButtonElement>(null);
  const closeProfile = useRef<HTMLButtonElement>(null);
  const motionFrame = useRef(0);
  const livePosition = useRef(0);
  const gesture = useRef<{ id: number; y: number; start: number; travel: number } | null>(null);
  const [position, setPosition] = useState(0);
  const [returning, setReturning] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const p = position / 1000;
  const aerial = ease(0.1, 0.27, p);
  const seam = ease(0.29, 0.405, p);
  const submerge = ease(0.438, 0.635, p);
  const blue = ease(0.505, 0.73, p);
  const seabed = ease(0.77, 0.98, p);
  const passing = ease(0.535, 0.9, p);
  const under = p >= 0.482;
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
  const pressure = deepestPressure * clamp((p - 0.482) / 0.518) ** 1.42;
  const depth = formatReading.format(Math.round(depthAtPressure(pressure) / 10) * 10);
  const reading = readingAt(pressure);
  const valueText = under ? `${depth} m below sea level` : region;
  const visuals = {
    "--pacific-title-rise": ease(0.04, 0.39, p),
    "--pacific-aerial": aerial,
    "--pacific-aerial-rise": `${mix(-4, -16, aerial)}%`,
    "--pacific-aerial-scale": mix(1.16, 1.39, aerial),
    "--pacific-seam": seam,
    "--pacific-water-rise": `${mix(9, -47, submerge)}%`,
    "--pacific-water-scale": mix(1.19, 1.65, submerge),
    "--pacific-blue": blue,
    "--pacific-floor": seabed,
    "--pacific-floor-rise": `${mix(13, -2, seabed)}%`,
    "--pacific-floor-scale": mix(1.06, 1.2, seabed),
    "--pacific-instrument": ease(0.54, 0.655, p) * (1 - ease(0.767, 0.92, p)),
    "--pacific-instrument-rise": `${mix(34, -46, passing)}%`,
    "--pacific-instrument-scale": mix(0.36, 1.4, passing),
  } as CSSProperties;

  useLayoutEffect(() => {
    const node = dialog.current;
    node?.showModal();
    back.current?.focus({ preventScroll: true });
    paintCamera(world.current, origin, 0);
    return () => {
      cancelAnimationFrame(motionFrame.current);
      node?.close();
    };
  }, [origin, world]);

  function seek(next: number) {
    livePosition.current = Math.round(clamp(next / 1000) * 1000);
    setPosition(livePosition.current);
    if (next < 482) setProfileOpen(false);
    if (next < 370) paintCamera(world.current, origin, livePosition.current / 1000);
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
    if (returning) return;
    setProfileOpen(false);
    setReturning(true);
    animateTo(0, onBack);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const held = gesture.current;
    if (!held || held.id !== event.pointerId || returning) return;
    seek(held.start + ((event.clientY - held.y) / held.travel) * 1000);
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
      onCancel={(event) => {
        event.preventDefault();
        if (profileOpen) {
          setProfileOpen(false);
          requestAnimationFrame(() => profile.current?.focus());
        } else returnToGlobe();
      }}
    >
      <div className="pacific-plates" aria-hidden="true">
        <div className="pacific-aerial">
          <img src={approach} alt="" />
        </div>
        <div className="pacific-water">
          <img src={water} alt="" />
        </div>
        <div className="pacific-blue" />
        <div className="pacific-seabed">
          <img src={floor} alt="" />
        </div>
        <img className="pacific-instrument" src={instrument} alt="" />
        <div className="pacific-vignette" />
      </div>
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
            travel: height * 0.65,
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
          <p className="pacific-region">{region}</p>
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
                setProfileOpen(!profileOpen);
                if (!profileOpen) requestAnimationFrame(() => closeProfile.current?.focus());
              }}
            >
              Recorded profile <span>{reading[1].toFixed(1)} °C</span>
            </button>
          ) : null}
        </div>
      )}
      {profileOpen && (
        <section className="pacific-profile" aria-labelledby="pacific-profile-title">
          <header>
            <h3 id="pacific-profile-title">Station ALOHA</h3>
            <button
              ref={closeProfile}
              type="button"
              onClick={() => {
                setProfileOpen(false);
                requestAnimationFrame(() => profile.current?.focus());
              }}
            >
              Close reading
            </button>
          </header>
          <p className="pacific-cast-date">
            19 December 2024 <span>{depth} m deep</span>
          </p>
          <Profile reading={reading} />
          <a href={source} target="_blank" rel="noreferrer">
            University of Hawaiʻi cast data
          </a>
        </section>
      )}
      <footer className="pacific-controls">
        <div className="pacific-controls-heading">
          <label htmlFor="pacific-depth">
            {returning
              ? "Returning to your globe"
              : position === 0
                ? "Drag down to descend"
                : position === 1000
                  ? "Drag up to ascend"
                  : "Drag to change depth"}
          </label>
          <span>{p < 0.15 ? "North Pacific" : "Illustrated descent"}</span>
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
