import type { RadarScan } from "../../sources/radar";
import { isGlobalRadar, type RadarView } from "./radarCamera";

let held: { scan: RadarScan; global: boolean; image: HTMLCanvasElement } | undefined;

export function holdRadarScan(view: RadarView) {
  if (!view.image || !view.scan || view.at !== view.scan.at) return;
  if (held?.scan === view.scan) return;
  const image = document.createElement("canvas");
  image.width = view.image.width;
  image.height = view.image.height;
  const context = image.getContext("2d");
  if (!context) return;
  // The player closes its bitmaps on unmount. Keep just the selected image across stops.
  context.drawImage(view.image, 0, 0);
  held = { scan: view.scan, global: isGlobalRadar(view.region), image };
}

export function readHeldRadarScan(global: boolean, at: number | undefined) {
  return held && held.global === global && held.scan.at === at ? held : undefined;
}
