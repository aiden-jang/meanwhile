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
          if (!align) {
            const anchor = document.getElementById(saved.focus);
            if (!anchor?.hasAttribute("data-observation-anchor")) return;
            // A marker can receive focus, disappear during the projection change, then reappear.
            const input = new AbortController();
            const timeout = window.setTimeout(cancel, 3500);
            const listen = { capture: true, passive: true, signal: input.signal };
            const refocus = () => {
              if (document.activeElement === anchor || !anchor.isConnected) return;
              if (anchor.getClientRects().length && getComputedStyle(anchor).visibility === "visible") {
                anchor.focus({ preventScroll: true });
              }
            };
            const painted = new MutationObserver(refocus);
            painted.observe(anchor, { attributes: true, attributeFilter: ["style", "data-positioned"] });
            stopObserving = () => {
              painted.disconnect();
              input.abort();
              clearTimeout(timeout);
            };
            for (const event of ["pointerdown", "wheel", "keydown", "popstate"])
              window.addEventListener(event, cancel, listen);
            window.addEventListener(
              "focusin",
              (event) => {
                if (
                  event.target !== anchor &&
                  event.target !== document.body &&
                  event.target !== document.documentElement &&
                  event.target !== document.getElementById(saved.scrollTarget) &&
                  event.target !== document.getElementById(saved.fallback ?? "")
                )
                  cancel();
              },
              listen,
            );
            refocus();
            return;
          }
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
