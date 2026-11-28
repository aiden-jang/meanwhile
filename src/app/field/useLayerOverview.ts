import { useMemo } from "react";
import type { Aurora } from "../../sources/aurora";
import { matches } from "../../data/filter";
import type { PlaceContextProps } from "../discovery/PlaceContext";
import type { useMapLayers } from "../useMapLayers";
import type { MapLayer } from "../layerVisibility";
import type { FeedStatus } from "../feedStatus";
import { quietLayer } from "../layerQuiet";
import { layerHealth } from "../layerMetadata";
const hazardKinds = { cyclones: "cyclone", fires: "fire", floods: "flood", volcanoes: "volcano" } as const;
export function useLayerOverview(
  places: PlaceContextProps,
  controls: ReturnType<typeof useMapLayers>,
  feeds: FeedStatus,
  archived: boolean,
  layer: MapLayer | null,
  aurora: Aurora | null,
) {
  const reports = {
    ...places,
    feeds: {
      ...places.feeds,
      rows: places.feeds.rows.filter(({ id }) =>
        id === "usgs" || id === "emsc"
          ? places.filters.sources.has(id)
          : Object.hasOwn(hazardKinds, id) && controls.visible[id],
      ),
    },
  };
  const health = layer && !archived ? layerHealth(layer, feeds.rows) : null;
  const hazardKind = layer && layer in hazardKinds ? hazardKinds[layer as keyof typeof hazardKinds] : null;
  const reportLayer = hazardKind ? (layer as keyof typeof hazardKinds) : null;
  const groups = places.hazards.filter((group) => group.kind === hazardKind);
  const quietCyclones =
    layer === "cyclones" &&
    !archived &&
    controls.enabled.cyclones &&
    feeds.rows.some(({ id, state }) => id === "cyclones" && state === "ok");
  const quakeCount = useMemo(() => {
    void places.revision;
    let count = 0;
    places.feed.store.forEach((quake) => {
      if (quake.primary.time <= places.at && matches(quake, places.filters, places.now)) count++;
    });
    return count;
  }, [places.feed, places.revision, places.at, places.filters, places.now]);
  const counts: Partial<Record<MapLayer, number>> = { earthquakes: quakeCount };
  for (const [id, kind] of Object.entries(hazardKinds))
    counts[id as MapLayer] = places.hazards.find((group) => group.kind === kind)?.rows.length ?? 0;
  if (aurora) counts.aurora = aurora.peak;
  if (controls.weather.wind?.frame) counts.wind = controls.weather.wind.frame.paths?.length ?? 0;
  if (controls.weather.lightning?.frame)
    counts.lightning = controls.weather.lightning.frame.marks?.length ?? 0;
  const quiet = (id: MapLayer) => quietLayer(id, feeds.rows, counts[id], archived);
  return { reports, health, reportLayer, groups, quietCyclones, quakeCount, quiet };
}
