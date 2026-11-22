import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { refreshAnnotations } from "../../globe/annotationInput";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { inStoryTopic, searchStories } from "../storyIndex";
import type { EarthScene } from "../useObservatory";
import { storyPlace, type StoryPlace } from "./places";

const locators = searchStories.flatMap((story) => {
  const place = storyPlace(story.id);
  return place ? [{ story, place }] : [];
});

export function RegionalStories({
  topic,
  locate,
  hidden,
}: {
  topic: EarthScene | null;
  hidden: boolean;
  locate: (place: StoryPlace, button: HTMLElement) => void;
}) {
  const navigation = useStoryNavigation();
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setStage(document.querySelector<HTMLElement>(".zone-canvas")), []);
  useLayoutEffect(() => {
    if (stage) refreshAnnotations();
  }, [stage, topic, hidden]);
  if (!stage) return null;

  return createPortal(
    <div className="regional-stories" role="group" aria-label="Stories in this view" hidden={hidden}>
      {locators
        .filter(({ story }) => inStoryTopic(story, topic))
        .map(({ story, place }) => (
          <button
            key={story.id}
            id={`regional-story-${story.id}`}
            type="button"
            data-story-preview={story.id}
            data-observation-anchor=""
            data-story-locator=""
            data-lon={place.lon}
            data-lat={place.lat}
            aria-label={`Locate ${story.title} · ${place.label}`}
            title={story.summary}
            disabled={!!navigation?.unavailable(story.id)}
            onClick={(event) => locate(place, event.currentTarget)}
          >
            <span>{place.label}</span>
            <strong>{story.title}</strong>
          </button>
        ))}
    </div>,
    stage,
  );
}
