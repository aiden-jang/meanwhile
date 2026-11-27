import type { MapLayer, MapLayers } from "../layerVisibility";
import type { SceneEntry } from "./sceneEntry";

export interface WorldSubject {
  point: { lon: number; lat: number; name: string };
  from: string;
  storyId?: string;
  title?: string;
  zoom?: number;
  layer?: MapLayer;
  stories?: readonly string[];
  reading?: {
    label: string;
    value?: string | undefined;
    at?: number | undefined;
    precision?: "date" | "minute";
  };
}

export interface WorldVisit {
  subject: WorldSubject;
  source?: SceneEntry | undefined;
  map: boolean;
  layers?: Partial<MapLayers>;
}
