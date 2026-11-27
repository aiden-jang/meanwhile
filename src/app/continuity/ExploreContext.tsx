import { distanceKm } from "../../geo/sphere";
import { storyPlaces } from "../discovery/places";
import type { MapLayer } from "../layerVisibility";
import { mapLayerNames } from "../layerVisibility";
import { searchStories } from "../storyIndex";
import type { WorldVisit } from "./worldSubject";
import "./continuity.css";

const layerStories: Record<MapLayer, readonly string[]> = {
  earthquakes: ["rupture", "fault", "tsunami"],
  volcanoes: ["kilauea", "tonga"],
  cyclones: ["katrina", "lights"],
  radar: ["rain", "atmospheric-river", "katrina"],
  wind: ["wind", "drifter", "dust"],
  floods: ["river", "rain"],
  fires: ["fire", "smoke", "air"],
  lightning: ["megaflash", "lightning"],
  aurora: ["aurora", "north", "sun"],
};
const dates = {
  date: new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }),
  minute: new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }),
};

export interface StorySelection {
  point?: { lon: number; lat: number; name?: string } | null;
  layer?: MapLayer | null;
  stories?: readonly string[];
  source?: string | undefined;
}

export function storiesForSelection({ point, layer, stories, source }: StorySelection) {
  const nearby = point
    ? Object.entries(storyPlaces)
        .map(([id, anchor]) => ({ id, km: distanceKm(point.lon, point.lat, anchor.lon, anchor.lat) }))
        .filter(({ km }) => km <= 650)
        .sort((a, b) => a.km - b.km)
        .map(({ id }) => id)
    : [];
  const ids = [...new Set([...(stories ?? []), ...nearby, ...(layer ? layerStories[layer] : [])])];
  return ids
    .filter((id) => id !== source)
    .flatMap((id) => searchStories.filter((story) => story.id === id))
    .slice(0, 2);
}

export function ExploreContextBack({ visit, back }: { visit: WorldVisit; back: () => void }) {
  if (!visit.source) return null;
  return (
    <button
      type="button"
      id="return-to-context-story"
      className="context-back"
      aria-label={`Back to ${visit.subject.from}`}
      title={`Back to ${visit.subject.from}`}
      onClick={back}
    >
      <BackArrow /> Back
    </button>
  );
}

export function ExploreContext({
  visit,
  onLayer,
  showStories,
  stories,
}: {
  visit: WorldVisit;
  onLayer: (layer: MapLayer) => void;
  showStories: () => void;
  stories: boolean;
}) {
  const { point, reading, layer } = visit.subject;
  if (!reading && stories) return null;
  return (
    <section className="world-context" aria-label={`From ${visit.subject.from}`}>
      {reading && (
        <div className="context-reading">
          <span>{reading.label}</span>
          {reading.value && <strong>{reading.value}</strong>}
          {reading.at !== undefined && (
            <time dateTime={new Date(reading.at).toISOString()}>
              {dates[reading.precision ?? "minute"].format(reading.at)}
              {reading.precision !== "date" && " UTC"}
            </time>
          )}
        </div>
      )}
      {!stories && (
        <div className="context-actions" aria-label={`Explore near ${point.name}`}>
          {layer && layer !== "earthquakes" && (
            <button type="button" onClick={() => onLayer(layer)}>
              {mapLayerNames[layer]}
            </button>
          )}
          <button type="button" onClick={showStories}>
            Related stories
          </button>
        </div>
      )}
    </section>
  );
}

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 8H3m4-4L3 8l4 4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ContextStories({
  selection,
  showAll,
  children,
}: {
  selection: StorySelection;
  showAll: () => void;
  children: React.ReactNode;
}) {
  const title = selection.point?.name
    ? `Related to ${selection.point.name}`
    : selection.layer
      ? `Related to ${mapLayerNames[selection.layer].toLowerCase()}`
      : "Related stories";
  return (
    <section className="context-stories" aria-labelledby="context-stories-title">
      <header>
        <h3 id="context-stories-title">{title}</h3>
        <button type="button" className="context-all-stories" onClick={showAll}>
          All stories
        </button>
      </header>
      {children}
    </section>
  );
}
