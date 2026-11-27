import type { Scrub } from "./scrub";
import type { useMapLayers } from "./useMapLayers";
import type { usePlaceInspection } from "./discovery/usePlaceInspection";
import type { SectionHinge, SectionLine } from "./section";

type Selection<T> = [value: T, set: (value: T) => void];

export function explorerReadings(
  layers: Pick<
    ReturnType<typeof useMapLayers>,
    "inspector" | "inspect" | "isolate" | "closeRewind" | "captureReading" | "restoreReading"
  >,
  place: ReturnType<typeof usePlaceInspection>,
  [quake, selectQuake]: Selection<string | null>,
  [hazard, selectHazard]: Selection<string | null>,
  [section, selectSection]: Selection<(SectionLine & { hinge?: SectionHinge }) | null>,
  [time, setTime]: Selection<Scrub>,
) {
  const capture = () => ({
    quake,
    hazard,
    section,
    point: place.point,
    weather: layers.captureReading(),
    time,
  });
  return {
    capture,
    restore(saved: ReturnType<typeof capture>) {
      selectQuake(saved.quake);
      selectHazard(saved.hazard);
      selectSection(saved.section);
      place.restore(saved.point);
      layers.restoreReading(saved.weather);
      setTime({ ...saved.time, playing: false });
    },
    clear() {
      selectQuake(null);
      selectHazard(null);
      selectSection(null);
      place.close();
    },
    inspect: layers.inspect,
    clearIsolation: () => layers.isolate(null),
    closeRadarRewind: layers.closeRewind,
    locate: place.restore,
    selectHazard,
    closeQuake: () => selectQuake(null),
  };
}
