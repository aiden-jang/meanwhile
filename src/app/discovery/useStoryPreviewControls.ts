import { useRef, useState } from "react";
import type { ObservatoryProps } from "../observatoryProps";
import { refreshAnnotations } from "../../globe/annotationInput";
import type { StoryPlace } from "./places";

export function useStoryPreviewControls(explorer: ObservatoryProps["explorer"]) {
  const [open, setOpen] = useState(false);
  const origin = useRef<{
    camera: ReturnType<typeof explorer.read>;
    flat: boolean;
    journey: boolean;
    place?: StoryPlace | undefined;
  } | null>(null);
  function clear() {
    origin.current = null;
    setOpen(false);
  }
  function preview(
    place?: Pick<StoryPlace, "lon" | "lat"> & { zoom?: number },
    restore = true,
    keepProjection = false,
  ) {
    if (place) {
      origin.current ??= { camera: explorer.read(), flat: explorer.flat, journey: keepProjection };
      if (!keepProjection) {
        origin.current.place =
          "label" in place && typeof place.label === "string" ? { ...place, label: place.label } : undefined;
        setOpen(true);
      }
      refreshAnnotations(place);
    } else if (origin.current?.journey === keepProjection) {
      const saved = origin.current;
      origin.current = null;
      if (!keepProjection) setOpen(false);
      if (restore) explorer.restore(saved.camera, keepProjection ? explorer.flat : saved.flat);
    }
  }
  return { origin, open, preview, clear };
}
