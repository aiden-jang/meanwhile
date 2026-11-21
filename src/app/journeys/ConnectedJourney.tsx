import { useEffect } from "react";
import { searchStories } from "../storyIndex";
import { journeys } from "./catalogue";
import { useStoryNavigation } from "./StoryNavigation";
import { warmThroughAir } from "./warmThroughAir";

export function ConnectedJourney({ compact = false }: { compact?: boolean }) {
  const navigation = useStoryNavigation();
  const route = navigation?.route;
  const journey = journeys.find(({ id }) => id === route?.id);
  const next = route && journey?.steps[route.step + 1]?.id;
  useEffect(() => {
    if (route?.id === "through-the-air") warmThroughAir(next ?? undefined);
  }, [route?.id, next]);
  if (!navigation || !route || !journey?.guide) return null;
  const step = journey.steps[route.step]!;
  const nextTitle = searchStories.find(({ id }) => id === next)?.title;
  return (
    <section
      className="connected-journey-steps"
      data-compact={compact || undefined}
      aria-label="Current journey"
    >
      <div className="connected-journey-progress">
        <h3>{journey.title}</h3>
        <span>
          {route.step + 1} of {journey.steps.length}
        </span>
      </div>
      {!compact && (
        <>
          <ol className="connected-journey-sources" aria-label="Data in this journey">
            {journey.guide.map((source, index) => (
              <li key={source} aria-current={index === route.step ? "step" : undefined}>
                {source}
              </li>
            ))}
          </ol>
          <p>{step.prompt}</p>
        </>
      )}
      <div className="observatory-actions">
        {route.step > 0 && (
          <button type="button" disabled={!!route.folding} onClick={() => navigation.step(route.step - 1)}>
            Previous view
          </button>
        )}
        {next ? (
          <button
            type="button"
            disabled={!!route.folding || !!navigation.unavailable(next)}
            onClick={() => navigation.step(route.step + 1)}
          >
            Next: {nextTitle}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              navigation.finish(true);
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>(
                    compact ? ".tonga-evidence-actions button:last-child" : ".related-stories summary",
                  )
                  ?.focus(),
              );
            }}
          >
            Finish journey
          </button>
        )}
      </div>
      {!compact && <small>{step.context}</small>}
      {route.folding && (
        <span className="sr-only" role="status">
          {route.folding === "curtain" ? "Folding the lidar slice…" : "Returning to the waterline…"}
        </span>
      )}
    </section>
  );
}
