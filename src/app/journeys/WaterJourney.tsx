import { searchStories } from "../storyIndex";
import { journeys } from "./catalogue";
import { useStoryNavigation } from "./StoryNavigation";

const water = journeys.find(({ id }) => id === "water-in-motion")!;
const sources = ["NOAA forecast", "NASA satellite estimate", "USGS gauge reading"];

export function WaterJourney() {
  const navigation = useStoryNavigation();
  const route = navigation?.route;
  if (!navigation || route?.id !== water.id) return null;
  const step = water.steps[route.step]!;
  const next = water.steps[route.step + 1]?.id;
  const nextTitle = searchStories.find(({ id }) => id === next)?.title;
  return (
    <section className="water-journey-steps" aria-label="Current journey">
      <div className="water-journey-progress">
        <h3>{water.title}</h3>
        <span>
          {route.step + 1} of {water.steps.length}
        </span>
      </div>
      <ol className="water-journey-sources" aria-label="Data in this journey">
        {sources.map((source, index) => (
          <li key={source} aria-current={index === route.step ? "step" : undefined}>
            {source}
          </li>
        ))}
      </ol>
      <p>{step.prompt}</p>
      <div className="observatory-actions">
        {route.step > 0 && (
          <button type="button" onClick={() => navigation.step(route.step - 1)}>
            Previous view
          </button>
        )}
        {next ? (
          <button
            type="button"
            disabled={!!navigation.unavailable(next)}
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
    </section>
  );
}
