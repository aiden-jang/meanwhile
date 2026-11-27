import { useEffect, useRef, useState } from "react";
import { FijiDescent, fijiFocus } from "./FijiDescent";
import type { useObservatory } from "./useObservatory";
import type { CameraState } from "../globe/controls";
import type { FlyTo } from "../globe/cameraTarget";

export function useFijiDescent(
  observatory: ReturnType<typeof useObservatory>,
  flat: boolean,
  stopTour: () => void,
  flyTo: { current: FlyTo },
  readCamera: { current: () => CameraState },
) {
  const fiji = observatory.observing && observatory.depthFocus?.descent ? observatory.depthFocus : null;
  const [fijiClosing, setFijiClosing] = useState(false);
  const fijiExitTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(fijiExitTimer.current), []);
  function backFromFiji() {
    if (fijiClosing) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      history.back();
      return;
    }
    setFijiClosing(true);
    const entry = history.state?.observatory?.id;
    fijiExitTimer.current = window.setTimeout(() => {
      if (entry === history.state?.observatory?.id) history.back();
      fijiExitTimer.current = window.setTimeout(() => setFijiClosing(false), 760);
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
      depth={fijiClosing ? 0 : (fiji?.sweepKm ?? 0)}
      closing={fijiClosing}
      closed={!fiji}
      onBack={backFromFiji}
      map={flat}
      setMap={observatory.observations.setMap}
      readCamera={readCamera.current}
      setDepth={(depth) => observatory.setDepthFocus(fijiFocus(depth))}
    />
  );
  return { fiji, fijiClosing, openFiji, fijiStage };
}
