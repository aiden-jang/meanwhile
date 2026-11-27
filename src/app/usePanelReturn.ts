import { useEffect, useState } from "react";
import { restorePanel, type PanelReturn } from "./panelReturn";

export function usePanelReturn() {
  const [restoration] = useState(() => {
    let frame = 0;
    let stopObserving: (() => void) | undefined;
    const cancel = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      stopObserving?.();
      stopObserving = undefined;
    };
    return {
      cancel,
      restore(saved: PanelReturn) {
        cancel();
        frame = requestAnimationFrame(() => {
          const align = restorePanel(saved);
          if (!align) return;
          // WebKit can commit the rail's scroll after the first frame following history navigation.
          frame = requestAnimationFrame(align);
          const target = document.getElementById(saved.focus);
          const results = target?.closest(".story-results");
          if (!target || !results) return;
          // The Continue caption can wrap a frame later. Hold the row until the visitor takes over.
          const resize = new ResizeObserver(align);
          resize.observe(results);
          const input = new AbortController();
          stopObserving = () => {
            resize.disconnect();
            input.abort();
          };
          for (const event of ["pointerdown", "wheel", "keydown"]) {
            window.addEventListener(event, cancel, { capture: true, passive: true, signal: input.signal });
          }
          target.addEventListener("blur", cancel, { signal: input.signal });
        });
      },
    };
  });
  useEffect(() => restoration.cancel, [restoration]);
  return restoration;
}
