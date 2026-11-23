import { useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useNarrow } from "./useNarrow";

export function ProjectionSwitch({
  flat,
  setFlat,
  visible,
  children,
}: {
  flat: boolean;
  setFlat: Dispatch<SetStateAction<boolean>>;
  visible: boolean;
  children: ReactNode;
}) {
  const narrow = useNarrow();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const restoreFocus = useRef<string>();
  const controls = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const next = narrow ? document.querySelector<HTMLElement>(".canvas-information") : null;
    if (next === target) return;
    const active = document.activeElement;
    if (active && controls.current?.contains(active)) restoreFocus.current = active.id;
    setTarget(next);
  }, [narrow, target]);
  useLayoutEffect(() => {
    if (restoreFocus.current) document.getElementById(restoreFocus.current)?.focus({ preventScroll: true });
    restoreFocus.current = undefined;
  }, [target]);
  const control = (
    <div ref={controls} className="explore-world-controls" hidden={!visible && !target}>
      {children}
      <div className="projection-switch" role="group" aria-label="Projection" data-flat={flat}>
        <span className="projection-current" aria-current="true">
          {flat ? "Map" : "Globe"}
        </span>
        <button
          type="button"
          id="view-projection"
          className="observatory-save"
          onClick={() => setFlat((value) => !value)}
          aria-description={flat ? "Switch to globe" : "Switch to map"}
        >
          {flat ? "Globe" : "Map"}
        </button>
      </div>
    </div>
  );
  return target ? createPortal(control, target) : control;
}
