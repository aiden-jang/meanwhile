import { useRef } from "react";

export function ShorelineHandle({ onAdjust }: { onAdjust: (percent: number) => void }) {
  const drag = useRef<{ pointer: number; offset: number }>();
  return (
    <div
      className="kilauea-divider-handle"
      data-survey-handle=""
      aria-hidden="true"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        const handle = event.currentTarget;
        drag.current = {
          pointer: event.pointerId,
          offset: event.clientX - handle.getBoundingClientRect().left - handle.offsetWidth / 2,
        };
        handle.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const held = drag.current;
        if (held?.pointer !== event.pointerId) return;
        const start = Number(event.currentTarget.dataset["start"]);
        const end = Number(event.currentTarget.dataset["end"]);
        const fraction = (event.clientX - held.offset - start) / (end - start);
        if (Number.isFinite(fraction)) onAdjust(Math.round(100 * Math.min(1, Math.max(0, fraction))));
      }}
      onLostPointerCapture={() => {
        drag.current = undefined;
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="m8 8-4 4 4 4m8-8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </div>
  );
}
