import { lazy, Suspense, type KeyboardEventHandler } from "react";
import type { CameraState } from "../../globe/controls";
import { geographicCoordinates } from "../../globe/orbitReadout";
import type { RadarScope } from "./RadarStage";
import { CopyLink } from "../CopyLink";
import type { useStoryNavigation } from "../journeys/StoryNavigation";
import type { useMapLayers } from "../useMapLayers";
import type { MapLayer } from "../layerVisibility";
import { rewindLink } from "./rewindLink";

const RadarLayer = lazy(() => import("./RadarLayer").then(({ RadarLayer }) => ({ default: RadarLayer })));

type Controls = ReturnType<typeof useMapLayers>;

export function LayerRadar({
  controls,
  rewindPoint,
  rewindAt,
  closeRewind,
  reveal,
  layer,
  flat,
  archived,
  panelVisible,
  readCamera,
  dismissReading,
  navigation,
  storm,
}: {
  controls: Controls;
  rewindPoint: Controls["rewindPoint"];
  rewindAt: number | undefined;
  closeRewind: () => void;
  reveal: NonNullable<Controls["radar"]>["reveal"];
  layer: MapLayer | null;
  flat: boolean;
  archived: boolean;
  panelVisible: boolean;
  readCamera: () => CameraState;
  dismissReading: KeyboardEventHandler<HTMLElement>;
  navigation: ReturnType<typeof useStoryNavigation>;
  storm: RadarScope | undefined;
}) {
  return (
    <div
      className={
        storm
          ? "layer-player live-storm-radar"
          : rewindPoint
            ? "layer-player place-context place-inspection radar-rewind"
            : "layer-player"
      }
      aria-labelledby={storm ? "storm-radar-title" : undefined}
      hidden={layer !== "radar" && !rewindPoint && !storm}
    >
      {rewindPoint && (
        <header>
          <div>
            <h2 id="radar-rewind-title" tabIndex={-1}>
              Radar rewind
            </h2>
            <p className="place-coordinates">{geographicCoordinates(rewindPoint)}</p>
          </div>
          <button type="button" onClick={closeRewind}>
            Back to live
          </button>
        </header>
      )}
      {storm?.visit.open ? (
        <header className="storm-radar-header">
          <button className="reading-back" type="button" onClick={storm.visit.back}>
            Back to live storm
          </button>
          <h2 id="storm-radar-title" tabIndex={-1}>
            Storm radar
          </h2>
          <p>RainViewer scans use a separate clock from storm advisories.</p>
        </header>
      ) : (
        storm && <h3 id="storm-radar-title">Recent radar</h3>
      )}
      {reveal && (
        <p role="status" className="radar-layer-note">
          Revealing radar…
        </p>
      )}
      {controls.radar && (
        <Suspense fallback={reveal ? null : <p role="status">Loading radar controls…</p>}>
          <RadarLayer
            suspended={controls.suspended || (!!(rewindPoint || storm) && !panelVisible)}
            rewind={!!controls.rewindPoint}
            storm={storm}
            dock={
              panelVisible &&
              !controls.suspended &&
              !reveal &&
              (layer === "radar" || rewindPoint || storm?.visit.open)
                ? dismissReading
                : undefined
            }
            hidden={!!reveal}
            onView={controls.updateRadar}
            initialAt={controls.selectedTimes.radar}
            onSelect={controls.selectTime}
          />
        </Suspense>
      )}
      {rewindPoint && !reveal && rewindAt !== undefined && (
        <CopyLink
          label="Copy radar link"
          format={(url) => rewindLink(url, readCamera(), rewindPoint, rewindAt, flat)}
        />
      )}
      {layer === "radar" && !archived && (
        <button
          type="button"
          id="open-explorer-radar"
          className="layer-story-link"
          onClick={() => navigation?.openRadar(controls.radarAt, flat)}
        >
          Follow a radar region <span>Guided view · same available scans</span>
        </button>
      )}
    </div>
  );
}
