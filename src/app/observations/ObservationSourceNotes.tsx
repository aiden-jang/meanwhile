import { observations, type ObservationId } from "./catalogue";
import { layerTime } from "../layerTime";
import type { ObservationFrame } from "./types";

export function ObservationSourceNotes({
  id,
  state,
  reason,
  retry,
  latest,
  imageStatus,
  retryImage,
  heldTime,
  heldFailure,
  heldPhoto,
  note,
}: {
  id: ObservationId;
  state: "loading" | "ready" | "failed" | "empty";
  reason: string | undefined;
  retry: () => void;
  latest: ObservationFrame | undefined;
  imageStatus: "loading" | "ready" | "failed";
  retryImage: () => void;
  heldTime: string | null;
  heldFailure: boolean;
  heldPhoto: boolean;
  note: string | undefined;
}) {
  const metadata = observations[id];
  return (
    <>
      {state === "loading" && (
        <p className="observation-note" role="status">
          Checking {metadata.source}…
        </p>
      )}
      {state === "failed" && (
        <div className="observation-note" role="status">
          <p>{reason ?? `Couldn’t load ${metadata.title} data from ${metadata.source}.`}</p>
          <div className="observatory-actions observation-chapters">
            <button type="button" onClick={retry}>
              Retry source
            </button>
          </div>
        </div>
      )}
      {state === "empty" && (
        <p className="observation-note" role="status">
          {metadata.empty}
        </p>
      )}
      {latest && (
        <p className="observation-note" role="status">
          Showing the last available readings ·{" "}
          {latest.timeLabel ?? (
            <time dateTime={new Date(latest.at).toISOString()}>{layerTime(latest.at)}</time>
          )}
        </p>
      )}
      {imageStatus === "failed" && (
        <div className="observation-note">
          <p role="status">
            No image could be loaded for this timestamp.
            {heldFailure
              ? ` Still showing ${heldTime}.`
              : heldPhoto
                ? " Showing the last loaded photograph."
                : ""}
          </p>
          {id === "rain" && (
            <button type="button" onClick={retryImage}>
              Retry satellite frame
            </button>
          )}
        </div>
      )}
      {imageStatus === "loading" && (
        <p className="observation-note" role="status">
          {heldTime !== null
            ? `Loading this image… Still showing ${heldTime}.`
            : heldPhoto
              ? "Loading this image… Showing the last loaded photograph."
              : "Loading this image…"}
        </p>
      )}
      {state === "loading" && heldTime !== null && imageStatus !== "loading" && (
        <p className="observation-note" role="status">
          Still showing {heldTime} while these readings load.
        </p>
      )}
      {note && <p className="observation-note">{note}</p>}
      <a
        className="observation-source"
        href={metadata.url}
        target="_blank"
        rel="noreferrer"
        aria-describedby="external-link-hint"
      >
        {metadata.source}
      </a>
    </>
  );
}
