import { useCallback, useRef, useState } from "react";
import type { StoryMoment } from "../observations/storyMoment";
import type { VisitPosition } from "../visitor/library";
import {
  createFloatPlayback,
  type FloatCheckpoint,
  type FloatDiveView,
  type FloatRestore,
} from "./floatPlayback";
import type { CameraState } from "../../globe/controlsTypes";
import { floatNavigationMoment, readFloatMoment } from "./floatMoment";

export function useFloatView(shared: StoryMoment | undefined, before: () => void, pose?: CameraState) {
  const entry = useRef<VisitPosition["float"]>(readFloatMoment(shared));
  const pending = useRef<{ state?: FloatRestore | undefined; pose?: CameraState | undefined } | undefined>(
    entry.current && pose ? { pose } : undefined,
  );
  const [view, setView] = useState<FloatDiveView | "opening" | null>(() =>
    shared?.id === "float" ? "opening" : null,
  );
  const update = useCallback((next: FloatDiveView | null, deliberate = false) => {
    if (deliberate) {
      entry.current = undefined;
      pending.current = undefined;
    }
    if (next && pending.current && entry.current?.profile === `${next.source}/${next.profile.id}`) {
      const { state, pose } = pending.current;
      pending.current = undefined;
      const target = pose ?? next.target;
      next = createFloatPlayback(next.profile, false, next.source, {
        ...next.checkpoint(target),
        ...(state ? { depth: state.depth, reading: { ...next.read(), ...state } } : {}),
      });
    }
    setView((active) => (active === null ? null : next));
  }, []);
  return {
    entry,
    view,
    setView,
    moment: (map = false): StoryMoment | undefined => floatNavigationMoment(view, entry.current, map),
    controls: {
      active: view !== null,
      view: view === "opening" ? null : view,
      entry: entry.current,
      update,
      open(
        resume?: VisitPosition["float"],
        saved?: FloatCheckpoint,
        state?: FloatRestore,
        pose?: CameraState,
      ) {
        before();
        pending.current = !saved && state ? { state, pose } : undefined;
        entry.current = !saved && resume ? { ...resume } : undefined;
        setView(saved ? createFloatPlayback(saved.profile, false, saved.source, saved) : "opening");
      },
      close() {
        before();
        pending.current = undefined;
        setView(null);
      },
    },
  };
}
