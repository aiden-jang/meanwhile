import { reportAnalytics } from "../../analytics/browser";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import type { ObservatoryProps } from "./observatoryProps";
import { SceneDiagram } from "./SceneDiagram";
import { cityNightOpening } from "./tonight/nightfall";
import type { EarthScene } from "./useObservatory";
import "./scene-entrances.css";

export const OBSERVATORY_SCENES = [
  { id: "live", name: "Earth" },
  { id: "depth", name: "Below the Surface" },
  { id: "night", name: "After Dark" },
] as const;

const sceneCues: Record<EarthScene, string> = {
  live: "Storm radar",
  depth: "Quake depths",
  night: "Local sky",
};

const trigger = (scene: EarthScene) => `observatory-entry-${scene}`;

export function useSceneEntrances({
  views,
  explorePaths,
  explorer,
  onScene,
  onHome,
  scene,
  ready,
}: ObservatoryProps) {
  const stories = useStoryNavigation();
  const memory = views.entranceVisits;
  const active =
    views.observations.trigger === trigger(scene) &&
    !views.observations.entry &&
    (scene === "depth" ? !!views.depthFocus?.archiveReading : scene === "night" && views.tonight.active)
      ? scene
      : undefined;

  function remember() {
    if (!active) return;
    memory.current[active] = views.navigation.capture({ ...explorer.read() });
  }

  return {
    active,
    starting: views.globeStarting,
    home() {
      remember();
      onHome();
      requestAnimationFrame(() =>
        document.getElementById(trigger(active ?? "live"))?.focus({ preventScroll: true }),
      );
    },
    open(subject: EarthScene) {
      if (active === subject || views.globeStarting) return;
      reportAnalytics({ name: "scene_selected", scene: subject });
      remember();
      if (subject === "live") {
        if (ready) explorePaths.radar();
        else explorePaths.resume();
        return;
      }
      const saved = memory.current[subject];
      if (saved && (subject !== "night" || saved.skyCity === views.skyCity.name)) {
        views.navigation.restore(saved);
        if (saved.deck.camera && (subject !== "night" || saved.deck.map || saved.sky.orbit))
          explorer.restore(saved.deck.camera, saved.deck.map);
      } else if (subject === "night") {
        stories?.openNightfall(cityNightOpening(views.skyCity.city, Date.now()), trigger(subject));
      } else {
        onScene(subject, true);
        views.observations.setTrigger(trigger(subject));
      }
      if (active)
        requestAnimationFrame(() =>
          document.getElementById(trigger(subject))?.focus({ preventScroll: true }),
        );
    },
  };
}

export function ObservatoryEntrances({
  ready,
  active,
  open,
  starting,
}: { ready: boolean } & Pick<ReturnType<typeof useSceneEntrances>, "active" | "open" | "starting">) {
  return (
    <div
      id="observatory-scenes"
      tabIndex={-1}
      className="observatory-scenes"
      data-active-scene={active}
      role="group"
      aria-label="Explore by subject"
      aria-busy={starting || undefined}
    >
      {OBSERVATORY_SCENES.map(({ id, name }) => (
        <button
          key={id}
          id={trigger(id)}
          type="button"
          onClick={() => open(id)}
          aria-label={name}
          aria-description={!active ? sceneCues[id] : undefined}
          aria-pressed={active === id}
          disabled={starting || (!ready && id !== "live")}
        >
          <SceneDiagram scene={id} />
          <span className="scene-label">
            {name}
            {!active && <small className="scene-entrance-cue">{sceneCues[id]}</small>}
          </span>
        </button>
      ))}
    </div>
  );
}
