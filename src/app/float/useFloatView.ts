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

export function useFloatView(shared: StoryMoment | undefined, before: () => void) {
  const entry = useRef<VisitPosition["float"]>(readFloatMoment(shared));
  const pending = useRef<{ state: FloatRestore; pose?: CameraState | undefined }>();
  const [view, setView] = useState<FloatDiveView | "opening" | null>(() =>
    entry.current ? "opening" : null,
  );
  const update = useCallback((next: FloatDiveView | null, deliberate = false) => {
    if (deliberate) {
      entry.current = undefined;
      pending.current = undefined;
    }
    if (next && pending.current && entry.current?.profile === `${next.source}/${next.profile.id}`) {
      const {
        state: { depth, ...reading },
        pose,
      } = pending.current;
      pending.current = undefined;
      const target = pose ?? next.target;
      next = createFloatPlayback(next.profile, false, next.source, {
        ...next.checkpoint(target),
        depth,
        reading: { ...next.read(), ...reading },
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
        entry.current = saved ? undefined : resume;
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
