import type { CameraState } from "../../globe/controls";
import type {
  ObservationFrame,
  ObservationSeries,
  ObservationTerrain,
  ObservationView,
} from "../observations/types";

import type { GlacierReadings } from "./glacierReadings";
import type { BasinReadings, ShorelineBasin } from "./shorelineBasins";

export interface StoryFrame extends ObservationFrame {
  caption: string;
  basins?: BasinReadings;
  pairedImage?: string;
}
export interface StorySite {
  id: string;
  label: string;
  lon: number;
  lat: number;
  at: number;
  measurement: string;
  observed: string;
}
export interface EarthStoryData {
  frames: readonly StoryFrame[];
  openingAt?: number;
  playbackDuration?: number;
  pace?: (position: number) => number;
  timelineCues?: boolean;
  sky?: (at: number) => NonNullable<ObservationView["sky"]>;
  geometry?: (frame: StoryFrame) => ObservationFrame;
  target: CameraState;
  coastalTarget?: CameraState;
  mapTarget?: CameraState;
  lens?: { globe: number; map: number };
  chapters: readonly { at: number; label: string; timeLabel?: string }[];
  series?: readonly ObservationSeries[];
  units?: string;
  sites?: readonly StorySite[];
  legend?: readonly { color: string; label: string }[];
  terrain?: ObservationTerrain;
  timelineLabel?: string;
  lunarImage?: string;
  basins?: readonly ShorelineBasin[];
  waterSamples?: Uint8Array | undefined;
  glacier?: { readings: GlacierReadings; earlier: string; later: string };
}
const files = import.meta.glob<string>("../../sources/earth-stories/assets/*.webp", {
  eager: true,
  query: "?url&no-inline",
  import: "default",
});
export function asset(name: string): string {
  const url = files[`../../sources/earth-stories/assets/${name}`];
  if (!url) throw new Error(`Missing story image: ${name}`);
  return url;
}
export const date = (day: string) => Date.parse(`${day}T12:00:00Z`);
export const point = ([lon, lat]: readonly number[]) => ({ lon: lon!, lat: lat! });
