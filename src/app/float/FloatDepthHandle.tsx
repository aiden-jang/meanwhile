import { useEffect, useRef, type PointerEvent } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import type { FloatDiveView } from "./floatPlayback";

export function FloatDepthHandle({ view, index }: { view: FloatDiveView; index: number }) {
  const { samples } = view.profile;
  const deepest = samples[0]!.depth;
  const shallowest = samples.at(-1)!.depth;
  const sample = samples[index]!;
  const drag = useRef<{ id: number; y: number; depth: number; height: number; pending: number }>();
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), [view]);
  function seek(depth: number, settle = false) {
    view.scrubDepth(depth, settle);
    refreshAnnotations();
  }
  function release(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    drag.current = undefined;
    event.currentTarget.removeAttribute("data-grabbing");
    seek(current.pending, true);
  }
  return (
    <div
      role="slider"
      tabIndex={0}
      className="float-depth-handle"
      aria-label="Float depth"
      aria-description="Drag vertically or use the arrow keys to move the float between samples."
      aria-orientation="vertical"
      aria-valuemin={Math.round(shallowest)}
      aria-valuemax={Math.round(deepest)}
      aria-valuenow={Math.round(sample.depth)}
      aria-valuetext={`${Math.round(sample.depth)} metres, ${sample.temperature.toFixed(2)} degrees Celsius`}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || drag.current) return;
        const track = event.currentTarget
          .closest(".float-reading-layer")
          ?.querySelector(".float-depth-track");
        const height = track?.getBoundingClientRect().height;
        if (!height) return;
        view.pause();
        const depth = view.depth();
        drag.current = { id: event.pointerId, y: event.clientY, height, depth, pending: depth };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.setAttribute("data-grabbing", "");
        event.currentTarget.focus({ preventScroll: true });
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        current.pending =
          current.depth + ((event.clientY - current.y) / current.height) * (deepest - shallowest);
        if (frame.current) return;
        frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          if (drag.current === current) seek(current.pending);
        });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(event) => {
        const current = view.read().index;
        const next =
          event.key === "Home"
            ? samples.length - 1
            : event.key === "End"
              ? 0
              : ["ArrowUp", "ArrowLeft"].includes(event.key)
                ? current + 1
                : ["ArrowDown", "ArrowRight"].includes(event.key)
                  ? current - 1
                  : undefined;
        if (next === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        seek(samples[Math.max(0, Math.min(samples.length - 1, next))]!.depth, true);
      }}
    />
  );
}
