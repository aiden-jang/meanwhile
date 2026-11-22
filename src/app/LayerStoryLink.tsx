import { useStoryNavigation } from "./journeys/StoryNavigation";

const labels = {
  aurora: "Fly through this forecast",
  wind: "Open Wind Atlas",
  lightning: "Open Lightning Live",
};

export function LayerStoryLink({
  id,
  at,
  map,
}: {
  id: keyof typeof labels;
  at: number | null | undefined;
  map: boolean;
}) {
  const navigation = useStoryNavigation();
  const trigger = `open-layer-${id}-story`;
  return (
    <button
      type="button"
      className="layer-story-link"
      id={trigger}
      disabled={!navigation || !!navigation.unavailable(id)}
      onClick={() =>
        navigation?.resume(
          {
            id,
            seen: Date.now(),
            position: { moment: { id, ...(at != null ? { at } : {}), map } },
          },
          trigger,
        )
      }
    >
      {labels[id]}
      <span>
        {id === "aurora" ? "NOAA forecast · magnetic poles" : "View the wider coverage and timeline"}
      </span>
    </button>
  );
}
