import { useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import { pickGlacierPoint } from "../../globe/glacierControls";
import type { GeoPoint } from "../observations/types";
import { glacierPoint, type GlacierReadings } from "./glacierReadings";

export function GlacierWorld({
  grid,
  sample,
  divider,
  ready,
  inspecting,
  select,
  pick,
  adjust,
  inspect,
}: {
  grid: GlacierReadings;
  sample: number;
  divider: number;
  ready: boolean;
  inspecting: boolean;
  select: (sample: number) => void;
  pick: (point: GeoPoint) => void;
  adjust: (divider: number) => void;
  inspect: (opener: HTMLButtonElement) => void;
}) {
  const [west, south, east, north] = grid.bounds;
  const point = glacierPoint(grid, sample);
  const pin = useGlacierDrag<HTMLButtonElement>(pick);
  const wipe = useGlacierDrag<HTMLInputElement>(({ lon }) => {
    adjust(Math.round(100 * Math.min(1, Math.max(0, (lon - west) / (east - west)))));
  });

  useLayoutEffect(() => refreshAnnotations(), [ready, sample, divider, inspecting]);

  return (
    <div
      className="glacier-world"
      data-glacier-world=""
      data-west={west}
      data-south={south}
      data-east={east}
      data-north={north}
      data-glacier-details={inspecting || undefined}
    >
      <div
        className="glacier-velocity-key"
        role="img"
        aria-label="Ice speed scale, 500 to 12,000 metres per year"
      >
        <span>Ice speed</span>
        <i aria-hidden="true" />
        <span>500–12,000 m/year</span>
      </div>
      {ready && (
        <>
          <span className="glacier-field-year" data-glacier-year="2013" aria-hidden="true">
            2013
          </span>
          <span className="glacier-field-year" data-glacier-year="2024" aria-hidden="true">
            2024
          </span>
        </>
      )}
      <div className="glacier-field-divider" data-glacier-divider="" data-fraction={divider / 100}>
        <svg width="26" height="21" viewBox="0 0 26 21" aria-hidden="true">
          <path d="m9 8-2.5 2.5L9 13m8-5 2.5 2.5L17 13" fill="none" stroke="currentColor" />
        </svg>
        <input
          type="range"
          min={0}
          max={100}
          value={divider}
          disabled={!ready || inspecting}
          aria-label="Velocity map divider"
          aria-valuetext={`${divider}% 2013 · ${100 - divider}% 2024`}
          onInput={(event) => adjust(event.currentTarget.valueAsNumber)}
          {...wipe}
        />
      </div>
      <button
        type="button"
        className="glacier-field-pin"
        data-glacier-pin=""
        data-sample={sample}
        data-lon={point.lon}
        data-lat={point.lat}
        aria-label="Drag sampling pin"
        aria-description="Drag or use the arrow keys to sample ice speed. Press Enter to inspect the point."
        disabled={!ready || inspecting}
        onClick={(event) => {
          if (event.detail === 0) inspect(event.currentTarget);
        }}
        onKeyDown={(event) => {
          const column = sample % grid.columns;
          const row = Math.floor(sample / grid.columns);
          const offset =
            event.key === "ArrowLeft" && column > 0
              ? -1
              : event.key === "ArrowRight" && column < grid.columns - 1
                ? 1
                : event.key === "ArrowUp" && row > 0
                  ? -grid.columns
                  : event.key === "ArrowDown" && row < grid.rows - 1
                    ? grid.columns
                    : 0;
          if (!event.key.startsWith("Arrow") || event.altKey || event.ctrlKey || event.metaKey) return;
          event.preventDefault();
          select(sample + offset);
        }}
        {...pin}
      >
        <span aria-hidden="true">Drag to sample</span>
      </button>
    </div>
  );
}

function useGlacierDrag<T extends HTMLElement>(read: (point: GeoPoint) => void) {
  const drag = useRef<{ pointer: number; x: number; y: number; frame: number; moved: boolean }>();
  const latest = useRef(read);
  latest.current = read;
  useEffect(() => () => cancelAnimationFrame(drag.current?.frame ?? 0), []);

  function apply(element: T, x: number, y: number) {
    const point = pickGlacierPoint(element, x, y);
    if (point) latest.current(point);
  }

  return {
    onPointerDown(event: PointerEvent<T>) {
      if (event.button !== 0 || !event.isPrimary || drag.current) return;
      const handle = event.currentTarget;
      const box = handle.getBoundingClientRect();
      handle.setPointerCapture(event.pointerId);
      handle.focus({ preventScroll: true });
      event.preventDefault();
      drag.current = {
        pointer: event.pointerId,
        x: event.clientX - box.left - box.width / 2,
        y: event.clientY - box.top - box.height / 2,
        frame: 0,
        moved: false,
      };
      handle.setAttribute("data-grabbing", "");
    },
    onPointerMove(event: PointerEvent<T>) {
      const held = drag.current;
      if (held?.pointer !== event.pointerId) return;
      held.moved = true;
      cancelAnimationFrame(held.frame);
      const handle = event.currentTarget;
      const x = event.clientX - held.x;
      const y = event.clientY - held.y;
      held.frame = requestAnimationFrame(() => apply(handle, x, y));
    },
    onPointerUp(event: PointerEvent<T>) {
      const held = drag.current;
      if (held?.pointer !== event.pointerId || !held.moved) return;
      cancelAnimationFrame(held.frame);
      apply(event.currentTarget, event.clientX - held.x, event.clientY - held.y);
    },
    onLostPointerCapture(event: PointerEvent<T>) {
      if (drag.current?.pointer !== event.pointerId) return;
      cancelAnimationFrame(drag.current.frame);
      drag.current = undefined;
      event.currentTarget.removeAttribute("data-grabbing");
    },
  };
}
