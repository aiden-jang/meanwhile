import { loadSource } from "../observations/load";

let smoke: Promise<void> | undefined;
export function warmJourneyStop(next: string | undefined) {
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
  } else if (next === "glacier") {
    void import("../earth-stories/atlasTerrain")
      .then(async ({ glacierStory }) => {
        const { glacier } = await glacierStory("2024");
        for (const url of [glacier?.earlier, glacier?.later]) {
          if (!url) continue;
          const image = new Image();
          image.fetchPriority = "low";
          image.src = url;
        }
      })
      .catch(() => {});
  } else if (next === "tsunami" || next === "tide") {
    void loadSource[next]().catch(() => {});
  } else if (next === "iceberg") {
    void import("../iceberg/IcebergDrift").catch(() => {});
  }
}
