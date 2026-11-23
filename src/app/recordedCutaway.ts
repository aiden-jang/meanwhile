import { useMemo, useState } from "react";
import { depthRecord, depthRecords, type DepthRecord } from "../data/depthRecords";
import type { CutawayFocus } from "../globe/cutaway";
import type { Stop } from "./tour";

export function recordedCutaway(archiveReading: DepthRecord = depthRecords[0]): CutawayFocus {
  return { lon: -176, lat: -18.3, dive: true, archiveReading, sweepKm: archiveReading.depthKm };
}

export function useDepthCutaway(
  { depthEvent }: { depthEvent?: DepthRecord["id"] },
  tour: Stop | null,
  { map }: { map: boolean },
) {
  const [focus, setFocus] = useState<CutawayFocus | null>(() =>
    depthEvent ? recordedCutaway(depthRecord(depthEvent)) : null,
  );
  const depthFocus = useMemo<CutawayFocus | null>(() => {
    if (tour?.purpose === "depth") return tour;
    if (focus?.archiveReading && map)
      return {
        lon: focus.lon,
        lat: focus.lat,
        archiveReading: focus.archiveReading,
        sweepKm: focus.sweepKm,
        cameraOnly: true,
      };
    return focus;
  }, [focus, map, tour]);
  return {
    focus,
    setFocus,
    depthFocus,
    selectDepth: (reading: DepthRecord) => setFocus(recordedCutaway(reading)),
    sweepDepth(sweepKm: number) {
      const reading = depthRecords.reduce<DepthRecord | undefined>(
        (best, event) => (event.depthKm <= sweepKm && (!best || event.depthKm > best.depthKm) ? event : best),
        undefined,
      );
      const shallowest = depthRecords.reduce((a, b) => (a.depthKm < b.depthKm ? a : b));
      setFocus({ ...recordedCutaway(reading ?? shallowest), sweepKm });
    },
  };
}
