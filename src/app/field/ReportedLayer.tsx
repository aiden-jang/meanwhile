import type { ReactNode } from "react";
import type { FeedStatus } from "../feedStatus";
import type { HazardGroup } from "../hazards";
import { HazardList } from "../HazardList";
import { mapLayerNames } from "../layerVisibility";
import { layerTime } from "../layerTime";
import { QuietCycloneLinks } from "../storm/StormLinks";

type ReportLayer = "cyclones" | "fires" | "floods" | "volcanoes";
export function ReportedLayer({
  layer,
  groups,
  feeds,
  archived,
  enabled,
  at,
  flat,
  quietCyclones,
  markId,
  onHazard,
  retryHazard,
  children,
}: {
  layer: ReportLayer;
  groups: HazardGroup[];
  feeds: FeedStatus;
  archived: boolean;
  enabled: boolean;
  at: number | undefined;
  flat: boolean;
  quietCyclones: boolean;
  markId: string | null;
  onHazard: (id: string) => void;
  retryHazard: (layer: ReportLayer) => void;
  children: ReactNode;
}) {
  const source = archived ? undefined : feeds.rows.find((row) => row.id === layer);
  const failed = enabled && source?.state === "failed";
  const pending = enabled && source?.state === "pending";
  return (
    <section aria-label={mapLayerNames[layer] + " reports"} className="layer-reports">
      {children}
      <p>This time window also applies to earthquake reports.</p>
      {failed || pending ? (
        <div className="report-source-state">
          <p role="status">
            {failed ? "GDACS didn’t respond." : "Checking GDACS…"}
            {source?.lastCheck !== undefined && groups.length > 0
              ? " Showing reports received " + layerTime(source.lastCheck) + "."
              : ""}
          </p>
          {failed && (
            <button type="button" className="layer-solo" onClick={() => retryHazard(layer)}>
              Check again
            </button>
          )}
        </div>
      ) : null}
      {groups.length ? (
        <HazardList hazards={groups} markId={markId} onHazard={onHazard} inline />
      ) : quietCyclones ? (
        <QuietCycloneLinks at={at} map={flat} />
      ) : !failed && !pending ? (
        <p role="status">
          {enabled
            ? "No matching reports from the available sources. This does not establish an absence of activity."
            : "Enable this layer to see reports."}
        </p>
      ) : null}
    </section>
  );
}
