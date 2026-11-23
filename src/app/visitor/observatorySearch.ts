import { mapLayerNames, type MapLayer } from "../layerVisibility";
import { findStories, normalizeStoryQuery } from "../storyIndex";
import { skyCities } from "../tonight/cities";

export type ExploreTarget =
  { kind: "place"; name: string; lon: number; lat: number } | { kind: "layer"; id: MapLayer; name: string };

const layers = (Object.keys(mapLayerNames) as MapLayer[]).map((id) => ({
  kind: "layer" as const,
  id,
  name: mapLayerNames[id],
}));

export function findObservatory(query: string) {
  const terms = normalizeStoryQuery(query).split(/\s+/).filter(Boolean);
  const matches = (text: string) => terms.length > 0 && terms.every((term) => text.includes(term));
  return {
    places: skyCities
      .filter(({ name }) => matches(normalizeStoryQuery(name)))
      .map(({ name, lon, lat }) => ({ kind: "place" as const, name, lon, lat })),
    stories: findStories(query),
    layers: layers.filter(({ id, name }) => matches(normalizeStoryQuery(`${name} ${id}`))),
  };
}
