import { layerTime } from "../layerTime";
import type { RadarScan } from "../../sources/radar";

const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
export const radarScanDate = (at: number) => shortDate.format(at);

export function radarScanStatus({
  latest,
  scans,
  images,
  checkedAt,
  status,
  image,
  provider,
  autoFocus,
}: {
  latest: RadarScan | undefined;
  scans: RadarScan[];
  images: ReadonlyMap<number, ImageBitmap | null>;
  checkedAt: number;
  status: "loading" | "ready" | "empty" | "error";
  image: ImageBitmap | null | undefined;
  provider: string;
  autoFocus: boolean;
}) {
  const delayed = latest !== undefined && checkedAt - latest.at > 20 * 60_000;
  const lastAvailable =
    status === "error" || status === "empty" ? scans.filter(({ id }) => images.get(id)).at(-1) : undefined;
  const statusText =
    status === "loading"
      ? `Loading ${provider} radar scans…`
      : status === "empty"
        ? "No recent radar scans available."
        : status === "error"
          ? `Couldn’t reach ${provider} radar.`
          : image === null
            ? "This scan’s image is unavailable."
            : image === undefined
              ? "Loading the selected scan…"
              : delayed
                ? `${provider}’s latest scan is delayed.`
                : autoFocus
                  ? "Automatic focus · area with visible returns"
                  : "Select a time to compare the observed scans.";
  const canRetry = status === "error" || status === "empty" || image === null;
  const problem = !!lastAvailable || canRetry || image === undefined || delayed;
  const statusMessage = (
    <>
      {lastAvailable ? (
        <>
          Showing the last available radar scans. Latest available scan{" "}
          <time dateTime={new Date(lastAvailable.at).toISOString()}>{layerTime(lastAvailable.at)}</time>.
          {image === null && " This scan’s image is unavailable."}
        </>
      ) : (
        statusText
      )}
    </>
  );

  return { canRetry, problem, statusMessage };
}
