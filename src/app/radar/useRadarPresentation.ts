import { useCallback, useRef, useState } from "react";
import { radarCamera, radarLink, type RadarEntry, type RadarView } from "./radarCamera";
import type { StoryMoment } from "../observations/storyMoment";

export function useRadarPresentation(story?: StoryMoment, pose?: RadarEntry["pose"]) {
  const [view, set] = useState<RadarView | null>(() => {
    if (story?.id !== "radar") return null;
    const { region = "world", at } = radarLink(story, pose);
    return { kind: "radar", region, target: radarCamera(region, pose), image: null, selectedAt: at };
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
