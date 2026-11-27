import { useEffect, useState } from "react";
import { LAST } from "./lavaTimeline";

export function useLavaPlayback(
  ready: boolean,
  index: number,
  advance: (n: number) => void,
  finish: () => void,
) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || !ready) return;
    let timer = 0;
    function schedule() {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        if (index < LAST) advance(index + 1);
        else {
          setPlaying(false);
          finish();
        }
      }, 820);
    }
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [ready, index, playing, advance, finish]);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const stop = (event: MediaQueryListEvent) => {
      if (event.matches) setPlaying(false);
    };
    motion.addEventListener("change", stop);
    return () => motion.removeEventListener("change", stop);
  }, []);
  return [playing, setPlaying] as const;
}
