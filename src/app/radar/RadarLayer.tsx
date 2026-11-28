import type { CameraState } from "../../globe/controls";
import type { RadarScope } from "./RadarStage";
import { RadarStage } from "./RadarStage";
import type { RadarView } from "./radarCamera";
import "./radar.css";
import { useCallback, type KeyboardEventHandler } from "react";

export function RadarLayer({
  onView,
  areaCamera,
  initialAt,
  onSelect,
  suspended = false,
  rewind = false,
  hidden = false,
  dock,
  storm,
}: {
  onView: (view: RadarView) => void;
  areaCamera?: (() => CameraState) | undefined;
  initialAt: number | null;
  suspended?: boolean;
  rewind?: boolean;
  hidden?: boolean;
  dock?: KeyboardEventHandler<HTMLElement> | undefined;
  storm?: RadarScope | undefined;
  onSelect: (id: "radar", at: number | null) => void;
}): JSX.Element {
  const select = useCallback((at: number | null) => onSelect("radar", at), [onSelect]);
  return (
    <section
      id="radar-layer-controls"
      className="radar-layer"
      aria-label="Storm radar playback"
      hidden={hidden}
    >
      <RadarStage
        global
        areaCamera={areaCamera}
        layer
        suspended={suspended}
        rewind={rewind}
        storm={storm}
        dock={dock}
        onView={onView}
        initialAt={initialAt ?? undefined}
        onSelect={select}
      />
      {rewind && !storm && <p className="radar-layer-note">Stripes mark areas with no listed coverage.</p>}
    </section>
  );
}
