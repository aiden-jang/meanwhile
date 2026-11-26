import { useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import { registerStormTrack, stormPositionAt } from "../../globe/stormTrackProjection";
import { FIXES, PEAK_INDEX, stormClock } from "./stormTrack";

const end = FIXES.length - 1;
const reducedMotion = "(prefers-reduced-motion: reduce)";

export function StormTrackWorld({
  selected,
  comparing,
  begin,
  select,
}: {
  selected: number;
  comparing: boolean;
  begin: () => void;
  select: (index: number) => void;
}) {
  const world = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const drag = useRef<{ pointer: number; offsetX: number; offsetY: number; index: number; moved: boolean }>();
  const latest = useRef(select);
  latest.current = select;
  useLayoutEffect(() => {
    const element = world.current;
    if (!element) return;
    const unregister = registerStormTrack(element, FIXES);
    refreshAnnotations();
    return unregister;
  }, []);
  useLayoutEffect(() => refreshAnnotations(), [comparing, selected]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function position(handle: HTMLButtonElement, at: number) {
    handle.dataset["dragPosition"] = String(at);
    refreshAnnotations();
  }

  function snap(handle: HTMLButtonElement, to: number) {
    cancelAnimationFrame(frame.current);
    const from = Number(handle.dataset["dragPosition"] ?? to);
    function finish() {
      delete handle.dataset["dragPosition"];
      refreshAnnotations();
    }
    if (from === to || matchMedia(reducedMotion).matches) return finish();
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / 135);
      if (t === 1) finish();
      else {
        position(handle, from + (to - from) * (1 - (1 - t) ** 3));
        frame.current = requestAnimationFrame(tick);
      }
    }
    frame.current = requestAnimationFrame(tick);
  }

  function scrub(handle: HTMLButtonElement, x: number, y: number, tap = false) {
    const held = drag.current;
    if (!held || !world.current) return;
    const point = stormPositionAt(world.current, x, y);
    if (!point || (tap && point.distance > 16)) return;
    const index = Math.round(point.position);
    position(handle, point.position);
    if (held.index !== index) {
      held.index = index;
      latest.current(index);
    }
  }

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary || drag.current) return;
    const handle = event.currentTarget;
    const box = handle.getBoundingClientRect();
    cancelAnimationFrame(frame.current);
    drag.current = {
      pointer: event.pointerId,
      offsetX: event.clientX - box.left - box.width / 2,
      offsetY: event.clientY - box.top - box.height / 2,
      index: selected,
      moved: false,
    };
    handle.setPointerCapture(event.pointerId);
    handle.setAttribute("data-grabbing", "");
    handle.focus({ preventScroll: true });
    event.preventDefault();
    begin();
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const held = drag.current;
    if (held?.pointer !== event.pointerId) return;
    const handle = event.currentTarget;
    const x = event.clientX - held.offsetX;
    const y = event.clientY - held.offsetY;
    held.moved = true;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => scrub(handle, x, y));
  }

  function up(event: PointerEvent<HTMLButtonElement>) {
    const held = drag.current;
    if (held?.pointer !== event.pointerId) return;
    const handle = event.currentTarget;
    cancelAnimationFrame(frame.current);
    if (held.moved) scrub(handle, event.clientX - held.offsetX, event.clientY - held.offsetY);
    else scrub(handle, event.clientX, event.clientY, true);
    finish(handle);
  }

  function finish(handle: HTMLButtonElement) {
    const held = drag.current;
    if (!held) return;
    drag.current = undefined;
    handle.removeAttribute("data-grabbing");
    snap(handle, held.index);
  }

  return (
    <div ref={world} className="storm-track-world" data-storm-track="">
      {comparing ? (
        <>
          <span className="storm-track-reference" data-storm-reference={PEAK_INDEX} aria-hidden="true">
            <span>Offshore peak</span>
          </span>
          <span
            className="storm-track-reference"
            data-storm-reference={end}
            data-landfall=""
            aria-hidden="true"
          >
            <span>Buras landfall</span>
          </span>
        </>
      ) : (
        <>
          <svg className="storm-track-path" aria-hidden="true">
            <polyline data-storm-trail="" />
          </svg>
          <button
            className="storm-track-handle"
            type="button"
            data-storm-handle=""
            data-position={selected}
            aria-label="Drag storm along track"
            aria-description={`${stormClock(FIXES[selected]!.time)}. Drag or use arrow keys to select a recorded position.`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onLostPointerCapture={(event) => {
              if (drag.current?.pointer === event.pointerId) finish(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.altKey || event.ctrlKey || event.metaKey) return;
              const offset =
                event.key === "ArrowLeft" || event.key === "ArrowDown"
                  ? -1
                  : event.key === "ArrowRight" || event.key === "ArrowUp"
                    ? 1
                    : 0;
              if (!offset) return;
              event.preventDefault();
              event.stopPropagation();
              cancelAnimationFrame(frame.current);
              delete event.currentTarget.dataset["dragPosition"];
              begin();
              latest.current(Math.max(0, Math.min(end, selected + offset)));
            }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <circle cx="15" cy="15" r="9" fill="var(--color-deck)" stroke="currentColor" />
              <circle cx="15" cy="15" r="3.2" fill="currentColor" />
              <path d="M15 2v3m0 20v3M2 15h3m20 0h3" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <span aria-hidden="true">Drag storm</span>
          </button>
        </>
      )}
    </div>
  );
}
