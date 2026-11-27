import type { Reading } from "../../data/types";
import type { MarkSubject } from "../MarkCard";
import type { MapLayer } from "../layerVisibility";
import type { ExplorePoint } from "../discovery/usePlaceInspection";
import type { StorySelection } from "./ExploreContext";
import type { WorldVisit } from "./worldSubject";

const hazardLayer = {
  cyclone: "cyclones",
  volcano: "volcanoes",
  fire: "fires",
  flood: "floods",
} as const;

export function storySelection(
  point: ExplorePoint | null | undefined,
  inspector: MapLayer | null,
  quake: Reading | undefined,
  hazard: MarkSubject | null,
  world: WorldVisit | undefined,
): StorySelection {
  if (quake)
    return {
      point: { lon: quake.lon, lat: quake.lat, name: quake.place || "the selected earthquake" },
      layer: "earthquakes",
    };
  if (hazard)
    return { point: { ...hazard.subject, name: "the selected event" }, layer: hazardLayer[hazard.kind] };
  if (world) {
    const source = world.subject.point;
    const here = !point || (point.lat === source.lat && point.lon === source.lon);
    return {
      point: here ? source : point,
      layer: inspector ?? (here ? (world.subject.layer ?? null) : null),
      stories: here ? (world.subject.stories ?? []) : [],
      source: world.subject.storyId,
    };
  }
  return { point: point ?? null, layer: inspector };
}
