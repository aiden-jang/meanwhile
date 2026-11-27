import { useLayoutEffect, useRef } from "react";
import type { DepthRecord } from "../data/depthRecords";
import { descentDrag, scrollDescent, type ScrubDepth } from "../globe/descentInput";

export function FijiQuakeButton({
  event,
  exposed,
  choose,
  scrub,
}: {
  event: DepthRecord;
  exposed: boolean;
  choose: (depth: number) => void;
  scrub: ScrubDepth;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const gesture = useRef({ id: -1, y: 0, moved: false, height: 1 });
  useLayoutEffect(() => {
    const node = button.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => scrollDescent(e, node.parentElement!.clientHeight, scrub);
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [scrub]);
  return (
    <button
      ref={button}
      type="button"
      className="fiji-section-hit"
      data-section-hit={event.id}
      aria-label={`Select ${event.depthKm} km earthquake, ${event.scale} ${event.magnitude}`}
      aria-hidden={!exposed || undefined}
      tabIndex={exposed ? 0 : -1}
      data-exposed={exposed || undefined}
      onPointerDown={(e) => {
        if (!e.isPrimary || e.button !== 0) return;
        gesture.current = {
          id: e.pointerId,
          y: e.clientY,
          moved: false,
          height: e.currentTarget.parentElement!.clientHeight,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.setAttribute("data-held", "");
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (g.id !== e.pointerId) return;
        const dy = e.clientY - g.y;
        if (!g.moved && Math.abs(dy) < 6) return;
        g.moved = true;
        g.y = e.clientY;
        scrub(descentDrag(dy, g.height), "drag");
      }}
      onLostPointerCapture={(e) => {
        gesture.current.id = -1;
        e.currentTarget.removeAttribute("data-held");
      }}
      onClick={(e) => {
        if (exposed && (!e.detail || !gesture.current.moved)) choose(event.depthKm);
        gesture.current.moved = false;
      }}
    />
  );
}
