import { useCallback, useRef, useState } from "react";
import { radarCamera, radarLink, type RadarView } from "./radarCamera";
import type { StoryMoment } from "../observations/storyMoment";

export function useRadarPresentation(story?: StoryMoment) {
  const [view, set] = useState<RadarView | null>(() => {
    if (story?.id !== "radar") return null;
    const { region = "world", at } = radarLink(story);
    return { kind: "radar", region, target: radarCamera(region), image: null, selectedAt: at };
  });
  const ready = useRef(false);
  const setView = useCallback((next: RadarView | null) => {
    ready.current = !!next?.image;
    set(next);
  }, []);
  const update = useCallback((next: RadarView | null) => {
    if (next?.image) ready.current = true;
    set((active) => (active === null ? null : next));
  }, []);
  // A later missing scan must not send an already framed radar view back home.
  return { view, setView, update, opening: view !== null && !ready.current };
}
