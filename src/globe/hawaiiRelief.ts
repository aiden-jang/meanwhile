import type { Group } from "three";
import { hawaiiDistance } from "../app/discovery/hawaiiPlaces";
import type { Controls } from "./controlsTypes";
import { createHawaiiDiscovery } from "./hawaiiDiscovery";

export function createHawaiiRelief(
  canvas: HTMLCanvasElement,
  controls: Controls,
  spin: Group,
  morph: { value: number },
) {
  const islands = createHawaiiDiscovery(canvas, controls);
  let relief: ReturnType<typeof import("../app/pacific/pacificRelief").attachPacificRelief> | undefined;
  let loading = false;
  let disposed = false;
  return {
    draw(target: { lon: number; lat: number } | undefined, zoom: number) {
      const exploring = islands.place();
      const surveying = target && hawaiiDistance(target.lon, target.lat) < 3;
      const opacity = exploring || surveying ? Math.min(0.92, Math.max(0, (28 - zoom) / 16)) : 0;
      if (opacity && !loading) {
        loading = true;
        void import("../app/pacific/pacificRelief")
          .then(({ attachPacificRelief }) => {
            if (!disposed)
              relief = attachPacificRelief(
                {
                  spin,
                  morph,
                  wake: () => canvas.dispatchEvent(new CustomEvent("scene-annotation")),
                },
                true,
              );
          })
          .catch(() => {});
      }
      relief?.show(opacity);
    },
    dispose() {
      disposed = true;
      relief?.dispose();
      islands.dispose();
    },
  };
}
