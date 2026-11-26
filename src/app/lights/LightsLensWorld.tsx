import { useEffect, useRef, type PointerEvent } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import { SURVEY_RASTER_RADIUS, surveyLensPick } from "../../globe/surveyLens";
import { cityPlace, clampLightsPoint, lightsCities, lightsPlaceName } from "./lightsSurface";
import type { useLightsLens } from "./useLightsLens";

type Lens = ReturnType<typeof useLightsLens>;

export function LightsLensWorld({
  lens,
  period,
  reading,
  ready,
  inspect,
}: {
  lens: Lens;
  period: string;
  reading: boolean;
  ready: boolean;
  inspect: (opener: HTMLButtonElement) => void;
}) {
  const frame = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean }>();
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const handle = event.currentTarget;
    const { x, y, width, height } = handle.getBoundingClientRect();
    if (!surveyLensPick(handle, event.clientX, event.clientY)) return;
    lens.move(lens.aperture.point);
    drag.current = {
      id: event.pointerId,
      x: x + width / 2 - event.clientX,
      y: y + height / 2 - event.clientY,
      moved: false,
    };
    handle.setPointerCapture(event.pointerId);
    handle.setAttribute("data-grabbing", "");
    handle.focus({ preventScroll: true });
    event.preventDefault();
    refreshAnnotations({ camera: "freeze" });
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const held = drag.current;
    if (!held || event.pointerId !== held.id) return;
    const handle = event.currentTarget;
    const { clientX, clientY } = event;
    held.moved = true;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => reposition(handle, clientX + held.x, clientY + held.y));
  }

  function reposition(handle: HTMLButtonElement, x: number, y: number) {
    const point = surveyLensPick(handle, x, y);
    if (point) lens.move(clampLightsPoint(point));
  }

  function finish(event: PointerEvent<HTMLButtonElement>, final: boolean) {
    const held = drag.current;
    if (!held || event.pointerId !== held.id) return;
    const handle = event.currentTarget;
    drag.current = undefined;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    cancelAnimationFrame(frame.current);
    if (final && held.moved) reposition(handle, event.clientX + held.x, event.clientY + held.y);
    handle.removeAttribute("data-grabbing");
    if (held.moved) lens.choose({ point: lens.aperture.point });
    else lens.move(lens.place.point);
  }

  return (
    <div className="recovery-world">
      <div className="recovery-source" data-world-inset="">
        NASA Black Marble <i />
        <span>Puerto Rico</span>
      </div>
      {ready &&
        !reading &&
        lightsCities
          .filter((city) => city.id !== lens.place.city)
          .map((city) => (
            <button
              key={city.id}
              type="button"
              className="recovery-pin"
              data-observation-anchor=""
              data-compact-anchor=""
              data-anchor-radius={SURVEY_RASTER_RADIUS}
              data-lon={city.lon}
              data-lat={city.lat}
              aria-label={city.name + " on the scene"}
              onClick={() => {
                refreshAnnotations({ camera: "freeze" });
                lens.choose(cityPlace(city), true);
              }}
            >
              <i aria-hidden="true" />
              <span aria-hidden="true">{city.name}</span>
            </button>
          ))}
      {ready && (
        <button
          type="button"
          className="recovery-lens"
          data-survey-lens=""
          tabIndex={reading ? -1 : 0}
          aria-hidden={reading || undefined}
          aria-label="Move the before-Maria lens"
          aria-description={
            lightsPlaceName(lens.place) + ". Drag or use the arrow keys. Press Enter to inspect."
          }
          onPointerDown={reading ? undefined : down}
          onPointerMove={move}
          onPointerUp={(event) => finish(event, true)}
          onPointerCancel={(event) => finish(event, false)}
          onLostPointerCapture={(event) => finish(event, false)}
          onClick={(event) => {
            if (!reading && event.detail === 0) inspect(event.currentTarget);
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.12 : 0.03;
            const offsets = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            } as const;
            const offset = offsets[event.key as keyof typeof offsets];
            if (reading || !offset) return;
            event.preventDefault();
            event.stopPropagation();
            refreshAnnotations({ camera: "freeze" });
            const { lon, lat } = lens.aperture.point;
            lens.choose({ point: clampLightsPoint({ lon: lon + offset[0], lat: lat + offset[1] }) });
          }}
        >
          <i className="recovery-crosshair" aria-hidden="true" />
          <span className="recovery-lens-caption" aria-hidden="true">
            Before Maria
          </span>
          {!reading && (
            <span className="recovery-grip" aria-hidden="true">
              <svg width="18" height="12" viewBox="0 0 18 12">
                <path d="M0 6h18M3 3 0 6l3 3m12-6 3 3-3 3" fill="none" stroke="currentColor" />
              </svg>
            </span>
          )}
        </button>
      )}
      {ready && (
        <div className="recovery-key" aria-label="Relative nighttime light intensity" data-world-inset="">
          <div>
            <i aria-hidden="true" />
            {period}
          </div>
          <div className="recovery-ramp">
            <span>Dimmer</span>
            <i aria-hidden="true" />
            <span>Brighter</span>
          </div>
        </div>
      )}
    </div>
  );
}
