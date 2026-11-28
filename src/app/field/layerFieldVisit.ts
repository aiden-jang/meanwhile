import type { MutableRefObject } from "react";
import type { useExplorerView } from "../useExplorerView";
import type { MapLayer } from "../layerVisibility";
import type { LayerReport } from "./QuakeReading";

export function layerFieldVisit(
  explorer: ReturnType<typeof useExplorerView>,
  setLayer: (id: MapLayer) => void,
  checkpoint: MutableRefObject<() => void>,
) {
  return {
    report: explorer.layerReport,
    inspect(id: MapLayer) {
      explorer.openLayerFromList(id);
      setLayer(id);
    },
    open(report: LayerReport) {
      checkpoint.current();
      explorer.openLayerReport(report);
    },
  };
}
