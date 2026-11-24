import { useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { captureHistoryPanel, readHistoryPanel } from "./historyPanel";
import { usePanelReturn } from "./usePanelReturn";
import { flushSync } from "react-dom";
import type { CameraState } from "../globe/controls";
import type { FlyTo } from "../globe/cameraTarget";
import type { PanelReturn } from "./panelReturn";

type Snapshot<T> = { value: T; camera: CameraState } & PanelReturn;

export function useSceneHistory<T>({
  route,
  checkpoint,
  readCamera,
  flyTo,
  lastWritten,
}: {
  route: { key: string; capture: () => T; restore: (value: T) => void };
  checkpoint: MutableRefObject<() => void>;
  readCamera: MutableRefObject<() => CameraState>;
  flyTo: MutableRefObject<FlyTo>;
  lastWritten: MutableRefObject<string>;
}) {
  const panelReturn = usePanelReturn();
  const [state] = useState(() => ({
    session: crypto.randomUUID(),
    id: 0,
    next: 0,
    key: route.key,
    snapshots: new Map<number, Snapshot<T>>(),
    restoring: false,
    initialPanel: readHistoryPanel(),
  }));
  const latest = useRef(route);
  latest.current = route;
  useLayoutEffect(() => {
    const current = state;
    const scrollRestoration = history.scrollRestoration;
    // The route snapshot owns rail scroll and focus, including after a native Back.
    history.scrollRestoration = "manual";
    const saveSnapshot = (write: boolean) => {
      panelReturn.cancel();
      if (current.restoring || latest.current.key !== current.key) return;
      const panel = captureHistoryPanel();
      current.snapshots.set(current.id, {
        value: latest.current.capture(),
        camera: { ...readCamera.current() },
        ...panel,
      });
      if (write) history.replaceState({ ...history.state, observatoryPanel: panel }, "");
    };
    checkpoint.current = () => saveSnapshot(true);
    const departing = () => saveSnapshot(true);
    history.replaceState({ ...history.state, observatory: { session: current.session, id: current.id } }, "");
    const back = (event: PopStateEvent) => {
      const target = event.state?.observatory;
      if (target?.session !== current.session) return;
      const saved = current.snapshots.get(target.id);
      if (!saved) return;
      saveSnapshot(false);
      current.id = target.id;
      current.restoring = true;
      lastWritten.current = location.hash;
      flushSync(() => latest.current.restore(saved.value));
      current.restoring = false;
      flyTo.current(saved.camera.lon, saved.camera.lat, saved.camera.zoom);
      panelReturn.restore(saved);
    };
    window.addEventListener("popstate", back);
    window.addEventListener("pagehide", departing);
    return () => {
      history.scrollRestoration = scrollRestoration;
      window.removeEventListener("popstate", back);
      window.removeEventListener("pagehide", departing);
      checkpoint.current = () => {};
    };
  }, [checkpoint, readCamera, flyTo, lastWritten, state, panelReturn]);
  useLayoutEffect(() => {
    const current = state;
    if (current.key !== route.key) {
      current.key = route.key;
      if (!current.restoring) {
        for (const id of current.snapshots.keys()) if (id > current.id) current.snapshots.delete(id);
        current.id = ++current.next;
        history.pushState(
          {
            ...history.state,
            observatoryPanel: undefined,
            observatory: { session: current.session, id: current.id },
          },
          "",
        );
      }
    }
    current.restoring = false;
    if (!current.snapshots.has(current.id)) {
      checkpoint.current();
      if (current.initialPanel) panelReturn.restore(current.initialPanel);
      current.initialPanel = undefined;
    }
  }, [route.key, checkpoint, state, panelReturn]);
}
