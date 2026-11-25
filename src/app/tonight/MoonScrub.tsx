import { useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { moonNight } from "../../geo/nightTrail";
import { skyBodies, type TonightView } from "../../geo/tonight";
import { nearestSkyTime, projectedMoonPaths } from "../../globe/projectedSkyPath";
import { skyTimeFormats } from "./SkyEarthReading";

const MINUTE = 60_000;

export function MoonScrub({
  view,
  start,
  onView,
}: {
  view: TonightView;
  start: number;
  onView: (view: TonightView) => void;
}) {
  const night = moonNight(view.city, start);
  const format = useMemo(() => skyTimeFormats(view.city.zone), [view.city.zone]);
  const drag = useRef<{
    id: number;
    arc: Element;
    rect: DOMRect;
    ox: number;
    oy: number;
    x: number;
    y: number;
    frame: number;
    moved: boolean;
  } | null>(null);
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => () => cancelAnimationFrame(drag.current?.frame ?? 0), []);

  function seek(at: number) {
    const current = latest.current;
    if (current.at === at && current.targetName === "Moon" && !current.nightTrail?.following) return;
    const next: TonightView = {
      ...current,
      at,
      bodies: skyBodies(current.city, at),
      targetName: "Moon",
      nightTrail: { points: night.points, following: false },
    };
    latest.current = next;
    onView(next);
  }

  function flush() {
    const pointer = drag.current;
    if (!pointer) return;
    cancelAnimationFrame(pointer.frame);
    pointer.frame = 0;
    const { arc, rect, x, y, ox, oy } = pointer;
    const path = projectedMoonPaths.get(arc);
    const at = path && nearestSkyTime(path, x - rect.left - ox, y - rect.top - oy, rect.width, rect.height);
    if (at !== undefined) seek(Math.round(at / MINUTE) * MINUTE);
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const handle = event.currentTarget;
    const arc = handle.closest("[data-stage]")?.querySelector<SVGPathElement>("[data-moon-arc]");
    if (!arc?.ownerSVGElement || !projectedMoonPaths.has(arc)) return;
    const marker = handle.getBoundingClientRect();
    const rect = arc.ownerSVGElement.getBoundingClientRect();
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
    drag.current = {
      id: event.pointerId,
      arc,
      rect,
      ox: event.clientX - marker.left - marker.width / 2,
      oy: event.clientY - marker.top - marker.height / 2,
      x: event.clientX,
      y: event.clientY,
      frame: 0,
      moved: false,
    };
    handle.setAttribute("data-dragging", "");
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const pointer = drag.current;
    if (pointer?.id !== event.pointerId) return;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 3) return;
    pointer.moved = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!pointer.frame) pointer.frame = requestAnimationFrame(flush);
  }

  function stop(event: PointerEvent<HTMLDivElement>) {
    const pointer = drag.current;
    if (pointer?.id !== event.pointerId) return;
    if (event.type === "pointerup" && pointer.moved) flush();
    cancelAnimationFrame(pointer.frame);
    drag.current = null;
    event.currentTarget.removeAttribute("data-dragging");
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const steps: Record<string, number> = {
      ArrowRight: 5,
      ArrowUp: 5,
      ArrowLeft: -5,
      ArrowDown: -5,
      PageUp: 30,
      PageDown: -30,
    };
    const step = steps[event.key];
    if (step === undefined && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const at =
      event.key === "Home"
        ? night.start
        : event.key === "End"
          ? night.end
          : latest.current.at + step! * MINUTE;
    seek(Math.min(night.end, Math.max(night.start, at)));
  }

  return (
    <div
      className="moon-scrub"
      data-body="Moon"
      data-moon-control=""
      role="slider"
      tabIndex={0}
      aria-label="Moon along its path"
      aria-valuemin={0}
      aria-valuemax={(night.end - night.start) / MINUTE}
      aria-valuenow={Math.round((view.at - night.start) / MINUTE)}
      aria-valuetext={format.local.format(view.at)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={key}
    >
      <small className="moon-drag-cue" aria-hidden="true">
        Drag the Moon
      </small>
    </div>
  );
}
