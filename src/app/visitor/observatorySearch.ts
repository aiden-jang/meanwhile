import { journeys } from "../journeys/catalogue";
import type { Library, Visit } from "./library";
import { visitNote } from "./VisitShelf";
import { mapLayerNames, type MapLayer } from "../layerVisibility";
import { findStories, normalizeStoryQuery, searchStories } from "../storyIndex";
import { skyCities } from "../tonight/cities";

export type ExploreTarget =
  { kind: "place"; name: string; lon: number; lat: number } | { kind: "layer"; id: MapLayer; name: string };

export const findEntrances = [
  { id: "live", name: "Earth", detail: "Live layers", terms: ["earth", "live layers"] },
  {
    id: "depth",
    name: "Below the Surface",
    detail: "Quake depths · Fiji and Tonga",
    terms: ["below the surface", "quake depths", "fiji"],
  },
  { id: "night", name: "After Dark", detail: "Tonight’s Sky", terms: ["after dark", "local sky"] },
] as const;

const layers = (Object.keys(mapLayerNames) as MapLayer[]).map((id) => ({
  kind: "layer" as const,
  id,
  name: mapLayerNames[id],
}));

export function findObservatory(query: string, library?: Library) {
  const terms = normalizeStoryQuery(query).split(/\s+/).filter(Boolean);
  const matches = (text: string) => {
    const normal = normalizeStoryQuery(text);
    return terms.length > 0 && terms.every((term) => normal.includes(term));
  };
  const stories = findStories(query);
  const matchesVisit = (visit: Visit) => {
    const story = searchStories.find(({ id }) => id === visit.id);
    return matches(`${visit.id} ${story?.title ?? ""} ${visitNote(visit)} ${visit.note ?? ""}`);
  };
  return {
    entrances: findEntrances.filter(({ terms: aliases }) =>
      aliases.some((alias) => alias === terms.join(" ")),
    ),
    places: skyCities
      .filter(({ name }) => matches(normalizeStoryQuery(name)))
      .map(({ name, lon, lat }) => ({ kind: "place" as const, name, lon, lat })),
    stories,
    journeys: journeys.filter(({ title, summary }) => matches(`${title} ${summary}`)),
    saved: library?.saved.filter(matchesVisit) ?? [],
    recent: (terms.length ? library?.recent.filter(matchesVisit) : library?.recent.slice(0, 3)) ?? [],
    layers: layers.filter(({ id, name }) => matches(normalizeStoryQuery(`${name} ${id}`))),
  };
}
