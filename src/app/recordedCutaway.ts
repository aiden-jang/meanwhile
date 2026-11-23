import { useMemo, useState } from "react";
import { depthRecord, depthRecords, type DepthRecord } from "../data/depthRecords";
import type { CutawayFocus } from "../globe/cutaway";
import type { Stop } from "./tour";

export function recordedCutaway(archiveReading: DepthRecord = depthRecords[0]): CutawayFocus {
  return { lon: -176, lat: -18.3, dive: true, archiveReading };
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
    return focus?.archiveReading && map ? { ...focus, cameraOnly: true as const } : focus;
  }, [focus, map, tour]);
  return {
    focus,
    setFocus,
    depthFocus,
    selectDepth: (reading: DepthRecord) => setFocus(recordedCutaway(reading)),
  };
}
