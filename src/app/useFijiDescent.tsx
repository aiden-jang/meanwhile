import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FijiDescent } from "./FijiDescent";
import { fijiFocus } from "./recordedCutaway";
import { fijiApproach } from "../globe/fijiApproach";
import { sceneEntry } from "./continuity/sceneEntry";
import type { useObservatory } from "./useObservatory";
import type { useGlobeCamera } from "./useGlobeCamera";
import type { DepthRecord } from "../data/depthRecords";

export function useFijiDescent(
  observatory: ReturnType<typeof useObservatory>,
  flat: boolean,
  stopTour: () => void,
  { flyTo, world }: Pick<ReturnType<typeof useGlobeCamera>, "flyTo" | "world">,
  nearby: (record: DepthRecord, fromFiji?: boolean) => void,
) {
  const fiji = observatory.observing && observatory.depthFocus?.descent ? observatory.depthFocus : null;
  const [exitDepth, setExitDepth] = useState<number | null>(null);
  const exitFrame = useRef(0);
  const fijiClosing = exitDepth !== null;
  useEffect(() => () => cancelAnimationFrame(exitFrame.current), []);
  useLayoutEffect(() => {
    if (!fiji && fijiClosing) {
      cancelAnimationFrame(exitFrame.current);
      setExitDepth(null);
    }
  }, [fiji, fijiClosing]);
  function leaveFiji(next: () => void) {
    if (fijiClosing) return;
    const from = fiji?.sweepKm ?? 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      next();
      return;
    }
    const entry = sceneEntry()?.id;
    const start = performance.now();
    setExitDepth(from);
    function fold(now: number) {
      if (entry !== sceneEntry()?.id) {
        setExitDepth(null);
        return;
      }
      const t = Math.min(1, (now - start) / 520);
      if (t < 1) {
        setExitDepth(from * (1 - t * t * (3 - 2 * t)));
        exitFrame.current = requestAnimationFrame(fold);
      } else {
        setExitDepth(0);
        next();
      }
    }
    exitFrame.current = requestAnimationFrame(fold);
  }
  function openFiji(opener?: HTMLElement) {
    opener?.focus({ preventScroll: true });
    observatory.checkpoint.current();
    stopTour();
    observatory.navigation.prepareStory("depth", false, () => {
      observatory.setDepthFocus(fijiFocus(0));
      observatory.observations.setMap(flat);
    });
    const target = fijiApproach(flat);
    flyTo.current(target.lon, target.lat, target.zoom);
  }
  const fijiStage = fiji && (
    <FijiDescent
      depth={fiji.sweepKm ?? 0}
      displayDepth={exitDepth ?? fiji.sweepKm ?? 0}
      closing={fijiClosing}
      onBack={() =>
        leaveFiji(() => {
          if ((sceneEntry()?.index ?? 0) > 0) history.back();
          else observatory.home(() => {});
        })
      }
      onExplore={(record) => leaveFiji(() => nearby(record, true))}
      map={flat}
      setMap={observatory.observations.setMap}
      controls={world.current?.controls}
      setDepth={(depth) => observatory.setDepthFocus(fijiFocus(depth))}
    />
  );
  return { fiji, exitDepth, openFiji, fijiStage };
}
