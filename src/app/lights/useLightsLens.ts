import { useEffect, useRef, useState } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import type { SurveyLens } from "../../globe/surveyLens";
import { lightsPlace, type LightsPlace } from "./lightsSurface";

export function useLightsLens(chapter?: string) {
  const [place, setPlace] = useState(() => lightsPlace(chapter));
  const aperture = useRef<SurveyLens>({ point: place.point }).current;
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function move(point: SurveyLens["point"]) {
    cancelAnimationFrame(frame.current);
    aperture.point = point;
    refreshAnnotations();
  }

  function choose(next: LightsPlace, animate = false) {
    cancelAnimationFrame(frame.current);
    setPlace(next);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce) {
      move(next.point);
      return;
    }
    const from = aperture.point;
    const start = performance.now();
    function step(now: number) {
      const fraction = Math.min(1, (now - start) / 250);
      const ease = 1 - (1 - fraction) ** 3;
      aperture.point =
        fraction === 1
          ? next.point
          : {
              lon: from.lon + (next.point.lon - from.lon) * ease,
              lat: from.lat + (next.point.lat - from.lat) * ease,
            };
      refreshAnnotations();
      if (fraction < 1) frame.current = requestAnimationFrame(step);
    }
    frame.current = requestAnimationFrame(step);
  }
  return { place, aperture, move, choose };
}
