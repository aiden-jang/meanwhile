import { useEffect, useState } from "react";
import type { CameraState } from "../../globe/controls";
import { useViewLocation } from "../viewLocation";

// Back can start on another continent. Keep the departure area's rows available to receive focus
// while the shared camera flies home. Direct input hands the area straight back to the visitor.
export function useReadingArea(readCamera: () => CameraState, inspecting: boolean) {
  useViewLocation();
  const { lon, lat } = readCamera();
  const [departure, hold] = useState<Pick<CameraState, "lon" | "lat">>();
  useEffect(() => {
    if (!departure || inspecting) return;
    const release = () => hold(undefined);
    const longitudeDelta = ((lon - departure.lon + 540) % 360) - 180;
    if (Math.abs(longitudeDelta) < 0.002 && Math.abs(lat - departure.lat) < 0.002) {
      release();
      return;
    }
    const scene = document.getElementById("globe-view");
    const input = new AbortController();
    const options = { capture: true, passive: true, signal: input.signal };
    for (const event of ["pointerdown", "wheel", "keydown"]) scene?.addEventListener(event, release, options);
    return () => input.abort();
  }, [departure, inspecting, lon, lat]);
  return { area: departure ?? { lon, lat }, hold: () => hold({ lon, lat }) };
}
