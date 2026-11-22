import type { EarthScene } from "./useObservatory";

export const featuredStories = {
  live: {
    id: "float",
    note: "North Atlantic · Argo profiles",
    action: "Follow the float",
    reason: "Follow a measured profile toward the surface.",
  },
  depth: {
    id: "rupture",
    note: "Tōhoku · 11 March 2011",
    action: "Trace the rupture",
    reason: "See where Tōhoku’s fault moved, then compare the recorded waves.",
  },
  night: {
    id: "moonfall",
    note: "Taurus–Littrow · December 1972",
    action: "Follow the rover",
    reason: "Leave the night sky and follow the rover across Taurus–Littrow.",
  },
} as const;

export const catalogueFeature = {
  id: "tonga",
  note: "Pacific Ocean · 15 January 2022",
  action: "Follow the wave",
  reason: "Track the wave across the Pacific.",
} as const;

// An editorial sequence, rather than source-module insertion order.
export const storyOrder = [
  "float",
  "moonfall",
  "rupture",
  "katrina",
  "sky",
  "iceberg",
  "tonga",
  "shadow",
  "kilauea",
  "megaflash",
  "seafloor",
  "aral",
  "aurora",
  "radar",
  "lights",
  "deep",
  "nino",
  "fault",
  "drifter",
  "eclipse",
  "apophis",
  "comet",
  "meteors",
  "orbit",
  "sun",
  "epic",
  "swell",
  "glacier",
  "ice",
  "ozone",
  "water",
  "bloom",
  "reef",
  "spring",
  "dust",
  "smoke",
  "fire",
  "north",
  "tsunami",
  "rain",
  "tide",
  "lightning",
  "wind",
  "river",
  "air",
  "atmospheric-river",
] as const;
const priority = new Map<string, number>(storyOrder.map((id, index) => [id, index]));
export const storyRank = (id: string) => priority.get(id) ?? storyOrder.length;

export const sceneHighlights: Record<EarthScene, readonly string[]> = {
  live: ["katrina", "iceberg", "radar"],
  depth: ["float", "seafloor", "nino"],
  night: ["sky", "aurora", "shadow"],
};
