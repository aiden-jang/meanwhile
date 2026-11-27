import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { scrollDescent, type ScrubDepth } from "../globe/descentInput";
import { stepToward } from "./roll";

export function useDescentScrub(
  value: number,
  maximum: number,
  units: number,
  enabled: boolean,
  change: (next: number) => void,
) {
  const live = useRef({ value, enabled, change });
  live.current = { value, enabled, change };
  const motion = useMemo(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let shown = 0;
    let target = 0;
    let published: number | null = null;
    let direct = false;
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      published = null;
    }
    function draw(now: number) {
      frame = 0;
      shown = direct || reduced.matches ? target : stepToward(shown, target, now - previous);
      previous = now;
      const next = Math.round(shown) / units;
      if (next !== published) {
        published = next;
        live.current.change(next);
      }
      if (shown !== target) frame = requestAnimationFrame(draw);
    }
    const move: ScrubDepth = (fraction, kind) => {
      if (!live.current.enabled) return;
      if (published === null) {
        published = live.current.value;
        shown = target = published * units;
      }
      // Reverse from the visible depth, even partway through a mouse-wheel notch.
      if ((target - shown) * fraction < 0 || (kind === "drag" && !direct)) target = shown;
      const limit = maximum * units;
      target = Math.max(0, Math.min(limit, target + fraction * limit));
      direct = kind === "drag";
      if (!frame && shown !== target) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    return {
      move,
      stop,
      sync: (next: number) => {
        if (next !== published) stop();
      },
    };
  }, [maximum, units]);
  useLayoutEffect(() => motion.sync(value), [motion, value]);
  useLayoutEffect(() => motion.stop, [motion, enabled]);
  return motion;
}

export function useDescentWheel(surface: RefObject<HTMLElement>, move: ScrubDepth, interrupt?: () => void) {
  const beforeMove = useRef(interrupt);
  beforeMove.current = interrupt;
  useLayoutEffect(() => {
    const node = surface.current;
    if (!node) return;
    const scrub: ScrubDepth = (fraction, kind) => {
      beforeMove.current?.();
      move(fraction, kind);
    };
    const wheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest("button, a, [data-descent-reading]"))
        return;
      scrollDescent(event, node.clientHeight, scrub);
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [surface, move]);
}
