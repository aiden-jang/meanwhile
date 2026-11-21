import { searchStories } from "../storyIndex";
import { journeys } from "./catalogue";
import { useStoryNavigation } from "./StoryNavigation";

export function ConnectedJourney() {
  const navigation = useStoryNavigation();
  const route = navigation?.route;
  const journey = journeys.find(({ id }) => id === route?.id);
  if (!navigation || !route || !journey?.guide) return null;
  const step = journey.steps[route.step]!;
  const next = journey.steps[route.step + 1]?.id;
  const nextTitle = searchStories.find(({ id }) => id === next)?.title;
  return (
    <section className="connected-journey-steps" aria-label="Current journey">
      <div className="connected-journey-progress">
        <h3>{journey.title}</h3>
        <span>
          {route.step + 1} of {journey.steps.length}
        </span>
      </div>
      <ol className="connected-journey-sources" aria-label="Data in this journey">
        {journey.guide.map((source, index) => (
          <li key={source} aria-current={index === route.step ? "step" : undefined}>
            {source}
          </li>
        ))}
      </ol>
      <p>{step.prompt}</p>
      <div className="observatory-actions">
        {route.step > 0 && (
          <button type="button" disabled={route.folding} onClick={() => navigation.step(route.step - 1)}>
            Previous view
          </button>
        )}
        {next ? (
          <button
            type="button"
            disabled={route.folding || !!navigation.unavailable(next)}
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
                document.querySelector<HTMLElement>(".related-stories summary")?.focus(),
              );
            }}
          >
            Finish journey
          </button>
        )}
      </div>
      <small>{step.context}</small>
      {route.folding && (
        <span className="sr-only" role="status">
          Returning to the waterline…
        </span>
      )}
    </section>
  );
}
