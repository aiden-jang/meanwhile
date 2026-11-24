import type { useMapLayers } from "./useMapLayers";
import type { usePlaceInspection } from "./discovery/usePlaceInspection";
import type { SectionHinge, SectionLine } from "./section";

type Selection<T> = [value: T, set: (value: T) => void];

export function explorerReadings(
  layers: Pick<ReturnType<typeof useMapLayers>, "inspector" | "inspect" | "closeRewind">,
  place: ReturnType<typeof usePlaceInspection>,
  [quake, selectQuake]: Selection<string | null>,
  [hazard, selectHazard]: Selection<string | null>,
  [section, selectSection]: Selection<(SectionLine & { hinge?: SectionHinge }) | null>,
) {
  const capture = () => ({ quake, hazard, section, point: place.point, layer: layers.inspector });
  return {
    capture,
    restore(saved: ReturnType<typeof capture>) {
      selectQuake(saved.quake);
      selectHazard(saved.hazard);
      selectSection(saved.section);
      place.restore(saved.point);
      layers.inspect(saved.layer);
    },
    clear() {
      selectQuake(null);
      selectHazard(null);
      selectSection(null);
      place.close();
    },
    inspect: layers.inspect,
    closeRadarRewind: layers.closeRewind,
    locate: place.restore,
    selectHazard,
    closeQuake: () => selectQuake(null),
  };
}
