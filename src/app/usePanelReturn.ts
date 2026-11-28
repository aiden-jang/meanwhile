import { useEffect, useState } from "react";
import { restorePanel, type PanelReturn } from "./panelReturn";

function waitForReplayReading(saved: PanelReturn, restore: () => void) {
  if (saved.scrollTarget !== "observatory-intro") return;
  const stage = document.querySelector(".zones:has(.replay-region .story-loading)");
  if (!stage) return;
  const input = new AbortController();
  let paint = 0;
  const contents = new MutationObserver(() => {
    if (stage.querySelector(".replay-region .story-loading")) return;
    contents.disconnect();
    paint = requestAnimationFrame(() => {
      cancel();
      if (stage.querySelector(".replay-region #observatory-intro")) restore();
    });
  });
  const cancel = () => {
    cancelAnimationFrame(paint);
    contents.disconnect();
    input.abort();
  };
  // The loading panel can be shorter than the saved offset. Wait for its real readings to mount.
  contents.observe(stage, { subtree: true, childList: true });
  for (const event of ["pointerdown", "wheel", "keydown", "popstate"])
    window.addEventListener(event, cancel, { capture: true, passive: true, signal: input.signal });
  return cancel;
}

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
            const waiting = waitForReplayReading(saved, () => restorePanel(saved));
            if (waiting) {
              stopObserving = waiting;
              return;
            }
            const anchor = document.getElementById(saved.focus);
            if (!anchor) return;
            const pin =
              anchor.closest<HTMLElement>("[data-island-place]") ??
              (anchor.hasAttribute("data-observation-anchor") ? anchor : null);
            if (!pin) return;
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
            painted.observe(pin, {
              attributes: true,
              attributeFilter: ["style", "hidden", "data-positioned"],
            });
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
