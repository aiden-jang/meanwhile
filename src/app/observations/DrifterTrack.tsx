import { useMemo } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import type { CameraState } from "../../globe/controls";
import type { ObservationFrame, ObservationView } from "./types";

export function useDrifterTrack(frames: readonly ObservationFrame[], seek: (at: number) => void) {
  return useMemo<ObservationView["pickMarks"]>(() => {
    if (!frames.length) return undefined;
    const fixes = frames.flatMap(({ at, marks }) => (marks?.[0] ? [{ ...marks[0], at }] : []));
    return {
      points: fixes,
      select: (index) => {
        const fix = fixes[index];
        if (fix) seek(fix.at);
      },
    };
  }, [frames, seek]);
}

export function DrifterTrack({
  overview,
  fix,
  pause,
}: {
  overview: CameraState;
  fix: CameraState | undefined;
  pause: () => void;
}) {
  const focus = (pose: CameraState) => {
    pause();
    refreshAnnotations(pose);
  };
  return (
    <div className="observatory-actions" role="group" aria-label="Drifter framing">
      <button type="button" onClick={() => focus(overview)}>
        Show the full track
      </button>
      {fix && (
        <button type="button" onClick={() => focus(fix)}>
          Focus this fix
        </button>
      )}
    </div>
  );
}
