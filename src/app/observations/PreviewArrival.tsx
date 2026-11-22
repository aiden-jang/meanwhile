import { useEffect, useLayoutEffect, useState } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import type { StoryPlace } from "../discovery/places";

export function PreviewArrival({ place, ready }: { place: StoryPlace; ready: boolean }) {
  const [shown, setShown] = useState(true);
  useLayoutEffect(() => refreshAnnotations(), [place, ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setShown(false), 1000);
    return () => window.clearTimeout(timer);
  }, [ready]);
  if (!shown) return null;
  return (
    <div className="preview-arrival" aria-hidden="true" data-arrived={ready || undefined}>
      <span data-observation-anchor="" data-compact-anchor="" data-lon={place.lon} data-lat={place.lat}>
        <i />
        {place.label}
      </span>
    </div>
  );
}
