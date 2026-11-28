import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { RadarScan } from "../../sources/radar";
import type { CameraState } from "../../globe/controls";
import { radarMercatorY } from "../../sources/rainviewer";
import { useViewLocation } from "../viewLocation";

let terrain: Promise<HTMLImageElement | null> | undefined;
function terrainImage() {
  if (!terrain) {
    const image = new Image();
    image.src = "/earth/terrain-small.webp";
    terrain = image.decode().then(
      () => image,
      () => null,
    );
  }
  return terrain;
}
const inverseMercator = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

function stripCrop(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  left: number,
  top: number,
  extent: number,
  height: number,
  x: number,
  dy: number,
  w: number,
  h: number,
) {
  const start = ((left % 1) + 1) % 1;
  for (const offset of [start, start - 1]) {
    ctx.drawImage(
      image,
      offset * sourceWidth,
      top * sourceHeight,
      extent * sourceWidth,
      height * sourceHeight,
      x,
      dy,
      w,
      h,
    );
  }
}

export function ScanStrip({
  scans,
  images,
  index,
  readCamera,
  seek,
  latestButton,
}: {
  scans: readonly RadarScan[];
  images: ReadonlyMap<number, ImageBitmap | null>;
  index: number;
  readCamera: () => CameraState;
  latestButton?: ReactNode;
  seek: (index: number) => void;
}) {
  useViewLocation();
  const { lon, lat, zoom } = readCamera();
  const canvas = useRef<HTMLCanvasElement>(null);
  const lonBand = Math.round(lon * 5) / 5,
    latBand = Math.round(lat * 5) / 5,
    zoomBand = Math.round(zoom * 5) / 5;
  useEffect(() => {
    let current = true;
    const draw = (land: HTMLImageElement | null) => {
      const node = canvas.current;
      const ctx = node?.getContext("2d");
      if (!current || !node || !ctx) return;
      const count = Math.min(5, scans.length),
        gap = 3,
        w = (node.width - (count - 1) * gap) / count,
        h = node.height;
      ctx.clearRect(0, 0, node.width, h);
      const extent = Math.min(0.15, Math.max(0.038, 0.18 / Math.max(1, zoomBand)));
      const span = (extent * h) / w,
        left = (lonBand + 180) / 360 - extent / 2;
      const top = Math.max(
        0,
        Math.min(1 - span, radarMercatorY(Math.min(84, Math.max(-84, latBand))) - span / 2),
      );
      const band = 3;
      let ready = 0;
      for (let i = 0; i < count; i++) {
        const scan = scans[Math.round((i * (scans.length - 1)) / Math.max(1, count - 1))]!;
        const image = images.get(scan.id);
        const x = i * (w + gap);
        ctx.fillStyle = "#162832";
        ctx.fillRect(x, 0, w, h);
        if (land) {
          ctx.globalAlpha = 0.54;
          for (let y = 0; y < h; y += band) {
            const end = Math.min(h, y + band);
            const north = (90 - inverseMercator(top + (span * y) / h)) / 180;
            const south = (90 - inverseMercator(top + (span * end) / h)) / 180;
            stripCrop(
              ctx,
              land,
              land.naturalWidth,
              land.naturalHeight,
              left,
              north,
              extent,
              south - north,
              x,
              y,
              w,
              end - y,
            );
          }
          ctx.globalAlpha = 1;
        }
        if (image && image.width) {
          ready++;
          stripCrop(ctx, image, image.width, image.height, left, top, extent, span, x, 0, w, h);
        } else {
          ctx.fillStyle = "rgba(9,18,25,.7)";
          ctx.fillRect(x, 0, w, h);
          ctx.fillStyle = "#a4b6bc";
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("…", x + w / 2, h / 2 + 5);
        }
      }
      node.dataset.readyScans = String(ready);
    };
    void terrainImage().then(draw);
    return () => {
      current = false;
    };
  }, [scans, images, lonBand, latBand, zoomBand]);
  const label = (i: number) => new Date(scans[i]!.at).toISOString().slice(11, 16);
  const position = index / Math.max(1, scans.length - 1);
  return (
    <div className="field-scan" style={{ "--scan-position": position } as CSSProperties}>
      <div className="field-strip">
        <canvas ref={canvas} aria-hidden="true" width="700" height="98" />
        <i aria-hidden="true" className="field-playhead" />
        <input
          type="range"
          min="0"
          max={scans.length - 1}
          step="1"
          value={index}
          aria-label="Radar scan time"
          aria-valuetext={label(index) + " UTC"}
          disabled={scans.length < 2}
          onChange={(e) => seek(e.currentTarget.valueAsNumber)}
        />
      </div>
      <div className="field-axis">
        <span>
          {label(0)}–{label(scans.length - 1)} UTC
        </span>
        <span>
          {scans.length} {scans.length === 1 ? "scan" : "scans"}
        </span>
        {latestButton}
      </div>
    </div>
  );
}
