import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { nearestFix, projectedFixes } from "../../globe/observationTrack";
import { dateLabel, nameOf, type Fix } from "./icebergTimeline";

type Drag = {
  id: number;
  track: SVGSVGElement;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  frame: number;
  moved: boolean;
};

export function IcebergHandle({
  fix,
  fragment,
  fixes,
  linked,
  onGrab,
  onSeek,
}: {
  fix: Fix;
  fragment: string;
  fixes: readonly Fix[];
  linked: boolean;
  onGrab: () => void;
  onSeek: (day: number) => void;
}) {
  const [day, lon, lat] = fix;
  const drag = useRef<Drag>();
  const current = useRef({ day, onSeek });
  current.current = { day, onSeek };
  useEffect(() => () => cancelAnimationFrame(drag.current?.frame ?? 0), []);

  function scrub(pointer: Drag) {
    pointer.frame = 0;
    const points = projectedFixes.get(pointer.track);
    if (!points?.length) return;
    const held = current.current;
    const next = nearestFix(points, pointer.x - pointer.offsetX, pointer.y - pointer.offsetY, held.day);
    if (next !== held.day) held.onSeek(next);
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const handle = event.currentTarget;
    const track = handle.parentElement?.querySelector<SVGSVGElement>("[data-observation-track]");
    if (!track || !projectedFixes.get(track)?.length) return;
    const { x, y, width, height } = handle.getBoundingClientRect();
    handle.setPointerCapture(event.pointerId);
    handle.setAttribute("data-dragging", "");
    event.preventDefault();
    handle.focus({ preventScroll: true });
    drag.current = {
      id: event.pointerId,
      track,
      offsetX: event.clientX - x - width / 2,
      offsetY: event.clientY - y - height / 2,
      x: event.clientX,
      y: event.clientY,
      frame: 0,
      moved: false,
    };
    onGrab();
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const pointer = drag.current;
    if (pointer?.id !== event.pointerId) return;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 3) return;
    pointer.moved = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!pointer.frame) pointer.frame = requestAnimationFrame(() => scrub(pointer));
  }

  function stop(event: PointerEvent<HTMLDivElement>) {
    const pointer = drag.current;
    if (pointer?.id !== event.pointerId) return;
    drag.current = undefined;
    cancelAnimationFrame(pointer.frame);
    if (event.type === "pointerup" && pointer.moved) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      scrub(pointer);
    }
    event.currentTarget.removeAttribute("data-dragging");
  }

  const index = fixes.indexOf(fix);
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let next: number;
    switch (event.key) {
      case "Home":
        next = 0;
        break;
      case "End":
        next = fixes.length - 1;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(fixes.length - 1, index + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(0, index - 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    onSeek(fixes[next]![0]);
  }

  return (
    <div
      className="iceberg-handle"
      data-observation-anchor=""
      data-compact-anchor=""
      data-track-handle=""
      data-day={day}
      data-lon={lon}
      data-lat={lat}
      data-evidence-source={linked || undefined}
      data-projection-anchor=""
      role="slider"
      tabIndex={0}
      aria-label={`${nameOf(fragment)} along its track`}
      aria-description="Drag or use the arrow keys to step between recorded fixes."
      aria-valuemin={0}
      aria-valuemax={fixes.length - 1}
      aria-valuenow={index}
      aria-valuetext={dateLabel(day)}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={key}
    >
      <span aria-hidden="true">Drag {nameOf(fragment)}</span>
    </div>
  );
}
