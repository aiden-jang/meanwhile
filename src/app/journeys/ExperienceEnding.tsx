import { lazy, Suspense, useEffect, useRef } from "react";
import { revealReading } from "../observations/revealReading";
import { SaveVisit } from "../visitor/VisitShelf";
import { searchStories } from "../storyIndex";
import { journeys } from "./catalogue";
import { recommendStory } from "./recommendation";
import { useStoryNavigation } from "./StoryNavigation";
import "./journeys.css";

const StoryFinding = lazy(() =>
  import("./StoryFinding")
    .then(({ StoryFinding }) => ({ default: StoryFinding }))
    .catch(() => ({ default: () => null })),
);
function Finding({
  id,
  completed,
  autoReveal = true,
}: {
  id: string;
  completed: boolean;
  autoReveal?: boolean;
}) {
  return completed ? (
    <Suspense fallback={null}>
      <StoryFinding id={id} completed autoReveal={autoReveal} />
    </Suspense>
  ) : null;
}

export function ExperienceEnding({
  id,
  showFinding = true,
  showSave = true,
}: { id?: string; showFinding?: boolean; showSave?: boolean } = {}) {
  const navigation = useStoryNavigation();
  const details = useRef<HTMLDetailsElement>(null);
  const active = id ?? navigation?.active;
  const completed = navigation?.completed ?? false;
  useEffect(() => {
    if (details.current) details.current.open = completed;
  }, [active, completed, navigation?.route]);
  if (!active || !navigation) return null;
  const route =
    navigation.route &&
    journeys.find((entry) => entry.id === navigation.route?.id)?.steps[navigation.route.step]?.id === active
      ? navigation.route
      : null;
  const journey = journeys.find((entry) => entry.id === route?.id);
  if (journey)
    return (
      <>
        {showFinding && <Finding id={active} completed={completed} autoReveal={false} />}
        {showSave && <SaveVisit />}
      </>
    );
  const next = recommendStory(active, navigation.library.recent, navigation.unavailable);
  const story = searchStories.find((entry) => entry.id === next?.id);
  if (!next || !story)
    return (
      <>
        {showFinding && <Finding id={active} completed={completed} />}
        {showSave && <SaveVisit />}
      </>
    );
  const reason = navigation.unavailable(story.id);
  return (
    <>
      {showFinding && <Finding id={active} completed={completed} />}
      {showSave && <SaveVisit />}
      <details
        ref={details}
        className="related-stories"
        onToggle={() => {
          if (details.current?.open && !completed) revealReading(details.current.querySelector("button"));
        }}
      >
        <summary>{completed ? "Up next" : "Keep exploring"}</summary>
        <p>{next.reason}</p>
        <button
          type="button"
          disabled={!!reason}
          id={`related-story-${story.id}`}
          onClick={() => navigation.open(story.id, `related-story-${story.id}`)}
        >
          <strong>{story.title}</strong>
          <span>{reason ?? story.summary}</span>
        </button>
      </details>
    </>
  );
}
