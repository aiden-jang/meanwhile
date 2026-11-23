import { useEffect, useId, useRef, useState } from "react";
import { StoryProjection } from "../observations/StoryProjection";
import { bearingLabel, type TonightView } from "../../geo/tonight";
import { manualSkyLook, useSkyLook } from "./useSkyLook";
import { traceSkyBody } from "./traceSkyBody";
import type { TonightPresentation } from "../../globe/scenePresentation";

const bearings = [
  { short: "N", name: "north", azimuth: 0 },
  { short: "E", name: "east", azimuth: 90 },
  { short: "S", name: "south", azimuth: 180 },
  { short: "W", name: "west", azimuth: 270 },
];

export function TonightCompass({
  view,
  onView,
  projection,
  orbit,
  onOrbit,
  cityReference,
  interactive = false,
}: {
  view: TonightPresentation | null;
  onView: (view: TonightView) => void;
  projection: { map: boolean; setMap: (map: boolean) => void };
  orbit: boolean;
  onOrbit: (orbit: boolean) => void;
  cityReference: boolean;
  interactive?: boolean;
}): JSX.Element {
  const [directions, setDirections] = useState(false);
  const menu = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const fromEarth = projection.map || orbit;
  const local = !!view && !fromEarth && !view.lunarDeparture;
  const handleLookKey = useSkyLook(view, onView, local);
  const compass = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!directions) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!compass.current?.contains(event.target as Node)) setDirections(false);
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [directions]);
  const target = view?.bodies.find(({ name }) => name === view.targetName);
  return (
    <div
      className="observatory-stage"
      data-stage="tonight"
      data-city-reference={cityReference || undefined}
      data-meteor-view={view?.radiantTrail ? true : undefined}
      role="group"
      aria-label={cityReference && fromEarth ? "Earth reference" : "Local horizon"}
    >
      <div className="stage-corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="stage-ident">
        <span className="stage-rule" aria-hidden="true" />
        <span>
          {view?.city.name ?? "After Dark"} ·{" "}
          {projection.map ? "Earth reference" : orbit ? "Orbit" : "Local horizon"}
        </span>
      </div>
      {!fromEarth && view?.radiantTrail && (
        <svg className="meteor-arc" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path data-sky-arc="" data-radiant-arc="" pathLength="1" />
        </svg>
      )}
      {!fromEarth && view?.nightTrail && target && (
        <svg
          key={target.name}
          className="night-arc"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${target.name}’s path above the horizon in ${view.city.name} through the selected night`}
        >
          <path data-sky-arc="" pathLength="1" />
        </svg>
      )}
      <div className="tonight-labels" data-sky-labels="" aria-hidden={!(interactive && local)}>
        {view?.bodies.map((body) =>
          interactive && local ? (
            <button
              key={body.name}
              type="button"
              data-body={body.name}
              data-target={target?.name === body.name || undefined}
              aria-label={`Trace ${body.name}`}
              onClick={() => body.altitude > 0 && onView(traceSkyBody(view, body))}
            >
              {body.name}
            </button>
          ) : (
            <span key={body.name} data-body={body.name} data-target={target?.name === body.name || undefined}>
              {body.name}
            </span>
          ),
        )}
      </div>
      {view && fromEarth && (
        <span
          className="sky-reference-marker"
          data-projection-anchor=""
          data-observation-anchor=""
          data-lon={view.city.lon}
          data-lat={view.city.lat}
        >
          {view.city.name}
        </span>
      )}
      {view && !view.radiantTrail && (!cityReference || fromEarth) && (
        <StoryProjection
          map={projection.map}
          globeActive={orbit && !projection.map}
          globeLabel={cityReference ? "Globe" : "Orbit"}
          onMap={(map) => {
            onOrbit(!map);
            projection.setMap(map);
          }}
          label="Sky reference projection"
        >
          {!cityReference && (
            <button
              type="button"
              aria-pressed={!fromEarth}
              onClick={() => {
                onOrbit(false);
                projection.setMap(false);
              }}
            >
              Local sky
            </button>
          )}
        </StoryProjection>
      )}
      {view && !fromEarth && (
        <div
          className="stage-readout tonight-compass"
          ref={compass}
          data-open-compass={directions || undefined}
          onBlur={(e) => {
            if (directions && e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget))
              setDirections(false);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Escape" || !directions) return;
            e.preventDefault();
            e.stopPropagation();
            setDirections(false);
            toggle.current?.focus({ preventScroll: true });
          }}
        >
          <span
            tabIndex={local ? 0 : undefined}
            role="group"
            aria-label="Look around the local sky"
            aria-description="Use the arrow keys to turn and tilt the view."
            onKeyDown={handleLookKey}
          >
            Facing {bearingLabel(view.look.azimuth)} · {Math.round(view.look.azimuth) % 360}°
            <small className="tonight-drag-hint">Drag to look around</small>
            {target && (
              <small className="tonight-target-bearing">
                {target.name}
                {view.nightTrail && " · Night path"} ·{" "}
                {target.altitude > 0 ? bearingLabel(target.azimuth) : "Below horizon"}
              </small>
            )}
          </span>
          <button
            className="compass-disclosure"
            ref={toggle}
            type="button"
            aria-controls={menu}
            aria-expanded={directions}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true });
              setDirections(!directions);
            }}
          >
            Directions
          </button>
          <div
            id={menu}
            className="observatory-actions"
            role="group"
            aria-label="Look direction"
            data-open={directions || undefined}
          >
            {bearings.map(({ short, name, azimuth }) => (
              <button
                key={short}
                type="button"
                aria-label={`Look ${name}`}
                aria-pressed={view.look.azimuth === azimuth && view.look.altitude === 16}
                onClick={() => {
                  onView(manualSkyLook(view, { azimuth, altitude: 16 }));
                  if (toggle.current?.getClientRects().length) {
                    setDirections(false);
                    toggle.current.focus({ preventScroll: true });
                  }
                }}
              >
                {short}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
