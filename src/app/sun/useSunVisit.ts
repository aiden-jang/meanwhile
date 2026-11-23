import { useCallback, useRef, useState, type RefObject } from "react";
import type { StoryMoment } from "../observations/storyMoment";
import type { AuroraRun } from "../../sources/auroraRoute";
import type { SpaceSample, WindSample } from "../../sources/spaceWeather";

type SolarSelection = { sample?: WindSample | undefined; xray?: SpaceSample | undefined };
type SolarVisit = SolarSelection & { position?: StoryMoment };

export function useSunVisit(
  before: () => void,
  changeRun: (update: (run: AuroraRun | null) => AuroraRun | null) => void,
  story?: StoryMoment,
) {
  const [visit, setVisit] = useState<SolarVisit | null>(() =>
    story?.id === "sun" ? { position: story } : null,
  );
  const current = useRef<StoryMoment>();
  const readings = useRef<SolarSelection>({});
  const position = current.current ?? visit?.position;
  const moment = (map: boolean): StoryMoment => ({ id: "sun", ...visit?.position, ...current.current, map });
  const restore = useCallback((next: typeof visit) => {
    current.current = undefined;
    readings.current = {};
    setVisit(next);
  }, []);
  return {
    visit: visit && { ...visit, ...readings.current, position },
    setVisit: restore,
    moment,
    position: visit?.position,
    remember(next: StoryMoment, selected?: SolarSelection) {
      current.current = next;
      readings.current = selected ?? {};
    },
    selection: () => readings.current,
    sample: visit?.sample,
    xray: visit?.xray,
    open(sample?: WindSample, frame?: StoryMoment, xray?: SpaceSample) {
      before();
      changeRun((run) => (run ? { ...run, held: true } : null));
      current.current = undefined;
      readings.current = {};
      setVisit({ sample, xray, ...(frame ? { position: frame } : {}) });
    },
    close() {
      before();
      current.current = undefined;
      readings.current = {};
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
