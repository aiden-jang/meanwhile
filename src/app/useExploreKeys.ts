import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { createFeed } from "./feed";
import { clamp as clampScrub, LIVE, nudge, togglePlay, type Scrub } from "./scrub";

interface Controls {
  feed: ReturnType<typeof createFeed>;
  windowMs: number;
  scrubAt: number | null;
  setScrub: Dispatch<SetStateAction<Scrub>>;
  stepDay: (offset: -1 | 1) => void;
  hasQuery: boolean;
  clearQuery: () => void;
  sectionOpen: boolean;
  closeSection: () => void;
  clearPins: () => void;
  closeStorm: (() => void) | undefined;
}

export function useExploreKeys(controls: Controls) {
  const latest = useRef(controls);
  latest.current = controls;
  useEffect(() => {
    // Read at the press. A span captured when the listener was armed is stale by however long the tab
    // has been open.
    const spanNow = (feed: Controls["feed"], windowMs: number) => {
      const at = Date.now();
      return feed.snapshot().archive ?? { from: at - windowMs, to: at };
    };
    const onKey = (e: KeyboardEvent): void => {
      const {
        feed,
        hasQuery,
        clearQuery,
        sectionOpen,
        closeSection,
        scrubAt,
        setScrub,
        windowMs,
        stepDay,
        clearPins,
        closeStorm,
      } = latest.current;
      if (e.key === "Escape" && !document.querySelector(":popover-open")) {
        // One rung at a time, innermost first: closing the pin and the section together undoes two decisions
        // with one press.
        if (e.defaultPrevented || e.cancelBubble) return;
        if (closeStorm) closeStorm();
        else if (hasQuery) clearQuery();
        else if (sectionOpen) closeSection();
        else if (scrubAt !== null) setScrub(LIVE);
        /* Both panels on one rung, cleared without being read. See ARCHITECTURE.md#srcapptsx. */
        else {
          clearPins();
        }
        return;
      }
      const active = document.activeElement;
      if (active && active !== document.body && active.id !== "globe-view") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        const live = spanNow(feed, windowMs);
        setScrub((sc) => togglePlay(clampScrub(sc, live), live));
      } else if (e.key === "," || e.key === ".") {
        // No shift multiplier: shift-comma is `<` here and something else on the next layout, so the hint
        // strip could not print it.
        const live = spanNow(feed, windowMs);
        setScrub((sc) => nudge(clampScrub(sc, live), live, e.key === "." ? 1 : -1));
      } else if (e.key === "f" || e.key === "F") {
        /* Requested on the frame, not on `documentElement`, so the letterboxing takes the page's background. */
        const el = document.querySelector(".frame");
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else if (el) void (el as HTMLElement).requestFullscreen?.().catch(() => {});
      } else if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        stepDay(e.key === "]" ? 1 : -1);
      } else return;
      // Space scrolls a page, so the transport must not depend on `overflow: hidden` staying true.
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
