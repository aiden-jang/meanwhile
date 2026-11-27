import { useEffect, useRef, useState } from "react";
import { FijiDescent } from "./FijiDescent";
import { fijiFocus } from "./recordedCutaway";
import { sceneEntry } from "./continuity/sceneEntry";
import type { useObservatory } from "./useObservatory";
import type { CameraState } from "../globe/controls";
import type { DepthRecord } from "../data/depthRecords";
import type { FlyTo } from "../globe/cameraTarget";

export function useFijiDescent(
  observatory: ReturnType<typeof useObservatory>,
  flat: boolean,
  stopTour: () => void,
  flyTo: { current: FlyTo },
  readCamera: { current: () => CameraState },
  nearby: (record: DepthRecord, fromFiji?: boolean) => void,
) {
  const fiji = observatory.observing && observatory.depthFocus?.descent ? observatory.depthFocus : null;
  const [fijiClosing, setFijiClosing] = useState(false);
  const fijiExitTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(fijiExitTimer.current), []);
  function leaveFiji(next: () => void, linger = true) {
    if (fijiClosing) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      next();
      return;
    }
    setFijiClosing(true);
    const entry = history.state?.observatory?.id;
    fijiExitTimer.current = window.setTimeout(() => {
      if (entry === history.state?.observatory?.id) next();
      if (linger) fijiExitTimer.current = window.setTimeout(() => setFijiClosing(false), 760);
      else setFijiClosing(false);
    }, 450);
  }

  function openFiji(opener?: HTMLElement) {
    opener?.focus({ preventScroll: true });
    observatory.checkpoint.current();
    stopTour();
    const focus = fijiFocus(0);
    observatory.navigation.prepareStory("depth", false, () => {
      observatory.setDepthFocus(focus);
      observatory.observations.setMap(flat);
    });
    flyTo.current(focus.lon, focus.lat, flat ? 2.42 : 1.84);
  }
  const fijiStage = (fiji || fijiClosing) && (
    <FijiDescent
      depth={fiji?.sweepKm ?? 0}
      closing={fijiClosing}
      closed={!fiji}
      onBack={() =>
        leaveFiji(() => {
          if ((sceneEntry()?.index ?? 0) > 0) history.back();
          else observatory.home(() => {});
        })
      }
      onExplore={(record) => leaveFiji(() => nearby(record, true), false)}
      map={flat}
      setMap={observatory.observations.setMap}
      readCamera={readCamera.current}
      setDepth={(depth) => observatory.setDepthFocus(fijiFocus(depth))}
    />
  );
  return { fiji, fijiClosing, openFiji, fijiStage };
}
