import { useEffect } from "react";
import { searchStories } from "../storyIndex";
import { journeys } from "./catalogue";
import { useStoryNavigation } from "./StoryNavigation";
import { revealReading } from "../observations/revealReading";
import { warmJourneyStop } from "./warmJourneyStop";

export function ConnectedJourney({ compact = false }: { compact?: boolean }) {
  const navigation = useStoryNavigation();
  const route = navigation?.route;
  const journey = journeys.find(({ id }) => id === route?.id);
  const next = route && journey?.steps[route.step + 1]?.id;
  useEffect(() => {
    warmJourneyStop(next ?? undefined);
  }, [next]);
  if (!navigation || !route || !journey) return null;
  const step = journey.steps[route.step]!;
  const action =
    step.id === "ice"
      ? { selector: ".observation-chart[data-scrubbable]", label: "Inspect extent chart" }
      : step.id === "glacier"
        ? {
            selector: ".terrain-comparison > .observatory-actions > button",
            label: "Compare velocity maps",
          }
        : null;
  const nextTitle = searchStories.find(({ id }) => id === next)?.title;
  const reading = !next ? navigation.current()?.position.moment : undefined;
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
          {journey.guide && (
            <ol className="connected-journey-sources" aria-label="Data in this journey">
              {journey.guide.map((source, index) => (
                <li key={source} aria-current={index === route.step ? "step" : undefined}>
                  {source}
                </li>
              ))}
            </ol>
          )}
          <p>{step.prompt}</p>
          {action && (
            <button
              type="button"
              className="journey-inspect"
              onClick={() => {
                const target = document.querySelector<HTMLElement>(action.selector);
                if (target instanceof HTMLButtonElement && target.getAttribute("aria-pressed") !== "true")
                  target.click();
                revealReading(target);
              }}
            >
              {action.label}
            </button>
          )}
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
      {!next && (
        <div className="journey-context" role="status">
          <p>{journey.ending}</p>
          {reading?.at !== undefined && (
            <small>
              Last selected ·{" "}
              {new Date(reading.at).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}
            </small>
          )}
        </div>
      )}
      {route.folding && (
        <span className="sr-only" role="status">
          {route.folding === "curtain" ? "Folding the lidar slice…" : "Returning to the waterline…"}
        </span>
      )}
    </section>
  );
}
