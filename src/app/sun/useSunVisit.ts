import { useCallback, useRef, useState, type RefObject } from "react";
import type { StoryMoment } from "../observations/storyMoment";
import type { AuroraRun } from "../../sources/auroraRoute";
import type { WindSample } from "../../sources/spaceWeather";

export function useSunVisit(
  before: () => void,
  changeRun: (update: (run: AuroraRun | null) => AuroraRun | null) => void,
  story?: StoryMoment,
) {
  const [visit, setVisit] = useState<{ sample?: WindSample | undefined; position?: StoryMoment } | null>(
    () => (story?.id === "sun" ? { position: story } : null),
  );
  const current = useRef<StoryMoment>();
  const position = current.current ?? visit?.position;
  const moment = (map: boolean): StoryMoment => ({ id: "sun", ...visit?.position, ...current.current, map });
  const restore = useCallback((next: typeof visit) => {
    current.current = undefined;
    setVisit(next);
  }, []);
  return {
    visit: visit && { ...visit, position },
    setVisit: restore,
    moment,
    position: visit?.position,
    remember(next: StoryMoment) {
      current.current = next;
    },
    sample: visit?.sample,
    open(sample?: WindSample, frame?: StoryMoment) {
      before();
      changeRun((run) => (run ? { ...run, held: true } : null));
      current.current = undefined;
      setVisit({ sample, ...(frame ? { position: frame } : {}) });
    },
    close() {
      before();
      current.current = undefined;
      setVisit(null);
    },
  };
}

export function useOvalReturn(panel: RefObject<HTMLElement>, sun: { open: () => void; close: () => void }) {
  const scroll = useRef(0);
  return {
    open() {
      scroll.current = panel.current?.scrollTop ?? 0;
      sun.open();
    },
    close() {
      sun.close();
      requestAnimationFrame(() => {
        panel.current?.scrollTo(0, scroll.current);
        panel.current?.querySelector<HTMLButtonElement>("#visit-sun-watch")?.focus({ preventScroll: true });
      });
    },
  };
}
