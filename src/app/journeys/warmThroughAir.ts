import { loadSource } from "../observations/load";

let smoke: Promise<void> | undefined;
export function warmThroughAir(next: string | undefined) {
  if (next === "smoke") {
    smoke ??= loadSource
      .smoke()
      .then(async (source) => {
        const data = await source.load("region", new AbortController().signal);
        const url = data.frames[0]?.raster?.url;
        if (!url) return;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = url;
        await image.decode();
      })
      .catch(() => {
        smoke = undefined;
      });
  } else if (next === "tonga") {
    void import("../tonga/TongaStage").catch(() => {});
    void import("../tonga/useTongaPlayback").then(({ warmTongaScans }) => warmTongaScans()).catch(() => {});
  }
}
