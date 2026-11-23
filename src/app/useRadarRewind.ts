import { useEffect } from "react";
import { refreshAnnotations } from "../globe/annotationInput";
import type { CameraState } from "../globe/controls";
import { RADAR_REVEAL_TIMEOUT } from "./radar/radarCamera";
import type { useMapLayers } from "./useMapLayers";

type LayerControls = ReturnType<typeof useMapLayers>;
type PlacePoint = Parameters<LayerControls["openRewind"]>[0];

export function useRadarRewind(controls: LayerControls, readCamera: () => CameraState) {
  const reveal = controls.radar?.reveal;
  useEffect(() => {
    if (!reveal) return;
    // Keep playback available if the rendering loop cannot run.
    const timeout = setTimeout(reveal.finish, RADAR_REVEAL_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [reveal]);

  function openRewind(point: PlacePoint) {
    const target = { ...point, zoom: Math.max(2.2, readCamera().zoom) };
    const cinematic = !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.openRewind(point, cinematic ? target : undefined);
    if (!cinematic) refreshAnnotations(target);
    requestAnimationFrame(() =>
      document.getElementById("radar-rewind-title")?.focus({ preventScroll: true }),
    );
  }

  function closeRewind() {
    controls.closeRewind();
    controls.selectTime("radar", null);
    requestAnimationFrame(() =>
      (document.getElementById("rewind-place-radar") ?? document.getElementById("globe-view"))?.focus(),
    );
  }
  return { reveal, openRewind, closeRewind };
}
