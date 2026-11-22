import type { ReactNode } from "react";
import "./story-controls.css";

export function StoryProjection({
  map,
  onMap,
  label = "Observation projection",
  globeActive = !map,
  globeLabel = "Globe",
  showEarth = true,
  children,
}: {
  map: boolean;
  onMap: (map: boolean) => void;
  label?: string;
  globeActive?: boolean;
  globeLabel?: string;
  showEarth?: boolean;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className="story-projection" role="group" aria-label={label}>
      {showEarth && (
        <>
          <button type="button" aria-pressed={globeActive} onClick={() => onMap(false)}>
            {globeLabel}
          </button>
          <button type="button" aria-pressed={map} onClick={() => onMap(true)}>
            Map
          </button>
        </>
      )}
      {children}
    </div>
  );
}
