import type { MutableRefObject } from "react";
import type { useArchive } from "./useArchive";
import type { useExplorerView } from "./useExplorerView";
import type { useObservatory } from "./useObservatory";
import type { explorerReadings } from "./explorerReadings";
import type { useGlobeCamera } from "./useGlobeCamera";
import type { usePacificDescent } from "./pacific/usePacificDescent";
import { useSceneHistory } from "./useSceneHistory";

type Camera = Pick<ReturnType<typeof useGlobeCamera>, "read" | "flyTo">;
type Readings = ReturnType<typeof explorerReadings>;

export function useExplorerHistory(
  explorer: ReturnType<typeof useExplorerView>,
  observatory: ReturnType<typeof useObservatory>,
  archive: ReturnType<typeof useArchive>,
  stopTour: () => void,
  { read: readCamera, flyTo }: Camera,
  lastWritten: MutableRefObject<string>,
  readings: Readings,
  pacific: ReturnType<typeof usePacificDescent>["history"],
) {
  useSceneHistory({
    route: {
      ...observatory.navigation,
      key: `${observatory.navigation.key}:${pacific.key}:${explorer.findEntry ?? explorer.nearby?.record.id ?? explorer.city?.city.name ?? (explorer.world && `world-${explorer.world.subject.point.name}`) ?? explorer.destination ?? ""}`,
      capture: () => {
        const camera = { ...readCamera.current() };
        const reading = readings.capture();
        const state = explorer.capture();
        if (
          !observatory.observing &&
          observatory.browser.pane === "layers" &&
          !explorer.nearby &&
          !explorer.city &&
          !explorer.world &&
          explorer.destination !== "storm"
        )
          explorer.lastFree.current = {
            preferredMap: state.preferredMap,
            camera,
          };
        return {
          view: observatory.navigation.capture(camera),
          day: archive.loadedDay,
          explorer: state,
          reading,
          pacific: pacific.capture(),
        };
      },
      restore(saved) {
        stopTour();
        explorer.restore(saved.explorer);
        pacific.restore(saved.pacific);
        observatory.navigation.restore(saved.view);
        const changedDay = saved.day !== archive.loadedDay || archive.archiveBusy;
        if (changedDay && saved.day) {
          void archive.loadArchive(saved.day, () => readings.restore(saved.reading));
        } else {
          if (changedDay) archive.backToLive();
          readings.restore(saved.reading);
        }
      },
    },
    checkpoint: observatory.checkpoint,
    readCamera,
    flyTo,
    lastWritten,
  });
}
