import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StoryThumbnail } from "../StoryThumbnail";
import { searchStories, normalizeStoryQuery } from "../storyIndex";
import { savedVisitKey, type Library, type Visit } from "./library";
import { visitNote } from "./VisitShelf";
import { LayerIcon } from "../LayerIcon";
import { findObservatory, type ExploreTarget } from "./observatorySearch";
import type { EarthScene } from "../useObservatory";
import type { FindPosition } from "./findPosition";
import { loadKilauea } from "../kilauea/loadKilauea";
import { prepareLavaRelief } from "../kilauea/lavaRelief";

export function FindObservatory({
  onClose,
  open,
  explore,
  unavailable,
  library,
  openJourney,
  openEntrance,
  resume,
  position,
  launch,
}: {
  onClose: () => void;
  open: (id: string) => void;
  explore: (target: ExploreTarget) => void;
  unavailable: (id: string) => string | null;
  library: Library;
  openJourney: (id: string) => void;
  openEntrance: (id: EarthScene) => void;
  resume: (visit: Visit, recent: boolean) => void;
  position: FindPosition | null;
  launch: (position: FindPosition, next: () => void) => void;
}) {
  const [query, setQuery] = useState(position?.query ?? "");
  const arrival = useRef(position);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const panel = dialog.current!;
    panel.showModal();
    const restored = arrival.current;
    const selected = [...panel.querySelectorAll<HTMLButtonElement>("[data-find-result]")].find(
      (button) => button.dataset["findResult"] === restored?.result && !button.disabled,
    );
    (selected ?? search.current)?.focus({ preventScroll: true });
    panel.scrollTop = restored?.scroll ?? 0;
    return () => panel.close();
  }, []);
  const results = findObservatory(query, library);
  const { entrances, places, stories, layers, journeys } = results;
  const term = normalizeStoryQuery(query);
  const ranked = [
    ...entrances.map(({ id, terms }) => ({ key: `entrance:${id}`, names: terms })),
    ...layers.map(({ id, name }) => ({ key: `layer:${id}`, names: [id, name] })),
    ...places.map(({ name }) => ({ key: `place:${name}`, names: [name] })),
    ...stories
      .filter(({ id }) => !unavailable(id))
      .map(({ id, title }) => ({ key: `story:${id}`, names: [title] })),
    ...journeys.map(({ id, title }) => ({ key: `journey:${id}`, names: [title] })),
  ];
  const primary =
    ranked.find(({ names }) => names.some((name) => normalizeStoryQuery(name) === term))?.key ??
    ranked[0]?.key ??
    (["Saved readings", "Recent visits"] as const).flatMap((label) =>
      (label === "Saved readings" ? results.saved : results.recent)
        .filter(({ id }) => !unavailable(id))
        .map((visit) => `${label}:${savedVisitKey(visit)}`),
    )[0];
  const offersKilauea = stories.some(({ id }) => id === "kilauea");
  useEffect(() => {
    if (!offersKilauea) return;
    void loadKilauea().catch(() => {});
    void prepareLavaRelief();
    document.querySelector("#globe-view canvas")?.dispatchEvent(new Event("prepare-observation-raster"));
  }, [offersKilauea]);
  const typing = !!query.trim();
  const count =
    entrances.length +
    places.length +
    stories.length +
    layers.length +
    journeys.length +
    results.saved.length +
    results.recent.length;
  const choose = (result: string, next: () => void) => {
    const panel = dialog.current!;
    const scroll = panel.scrollTop;
    panel.close();
    launch({ query, result, scroll }, next);
  };
  return createPortal(
    <dialog
      ref={dialog}
      id="observatory-find"
      className="saved-collection"
      aria-labelledby="observatory-find-title"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="find-toolbar">
        <div className="saved-collection-heading">
          <h2 id="observatory-find-title">Find</h2>
          <button type="button" aria-label="Close Find" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="story-search explorer-search">
          <input
            ref={search}
            type="search"
            autoComplete="off"
            aria-label="Search places, stories and layers"
            placeholder="Try Tokyo, Tonga or radar…"
            value={query}
            onInput={(event) => {
              setQuery(event.currentTarget.value);
              dialog.current?.scrollTo(0, 0);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              const options = Array.from(
                dialog.current?.querySelectorAll<HTMLButtonElement>(".find-result:enabled") ?? [],
              );
              options.find((row) => row.dataset["findResult"] === primary)?.click();
            }}
          />
        </div>
        {typing && primary && <p className="find-enter-hint">Enter opens the highlighted result</p>}
      </div>
      <p className="sr-only" role="status">
        {query.trim() ? `${count} ${count === 1 ? "result" : "results"}` : ""}
      </p>
      {(!typing || !count) && (
        <>
          <p className="find-empty">
            {typing ? "No matches. " : ""}
            Search featured cities, layers, stories, journeys and saved readings.
          </p>
          <div className="find-examples" aria-label="Search examples">
            {["Tokyo", "Storm radar", "Ice in Motion"].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  search.current?.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </>
      )}
      {!!entrances.length && (
        <section className="find-results" aria-label="Explore shortcuts">
          <h3>Explore</h3>
          {entrances.map(({ id, name, detail }) => (
            <button
              key={id}
              type="button"
              className="find-result"
              data-find-result={`entrance:${id}`}
              data-find-primary={primary === `entrance:${id}` || undefined}
              onClick={() => choose(`entrance:${id}`, () => openEntrance(id))}
            >
              <span>
                <strong>{name}</strong>
                <small>{detail}</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </section>
      )}
      {(
        [
          ["Saved readings", results.saved],
          ["Recent visits", results.recent],
        ] as const
      ).map(
        ([label, visits]) =>
          visits.length > 0 && (
            <section key={label} className="find-results" aria-label={label}>
              <h3>{label}</h3>
              {visits.map((visit) => (
                <button
                  key={savedVisitKey(visit)}
                  type="button"
                  className="find-result find-story-result"
                  data-find-result={`${label}:${savedVisitKey(visit)}`}
                  data-find-primary={(typing && primary === `${label}:${savedVisitKey(visit)}`) || undefined}
                  disabled={!!unavailable(visit.id)}
                  onClick={() =>
                    choose(`${label}:${savedVisitKey(visit)}`, () => resume(visit, label === "Recent visits"))
                  }
                >
                  <StoryThumbnail id={visit.id} />
                  <span>
                    {searchStories.find(({ id }) => id === visit.id)?.title ?? visit.id}
                    <small>{unavailable(visit.id) ?? visitNote(visit)}</small>
                  </span>
                </button>
              ))}
            </section>
          ),
      )}
      {!!layers.length && (
        <section className="find-results" aria-label="Layers">
          <h3>Layers</h3>
          {layers.map((layer) => (
            <button
              type="button"
              className="find-result"
              key={layer.id}
              data-find-primary={primary === `layer:${layer.id}` || undefined}
              data-find-result={`layer:${layer.id}`}
              onClick={() => choose(`layer:${layer.id}`, () => explore(layer))}
            >
              <LayerIcon layer={layer.id} />
              <span>{layer.name}</span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </section>
      )}
      {!!journeys.length && (
        <section className="find-results" aria-label="Journeys">
          <h3>Journeys</h3>
          {journeys.map((journey) => (
            <button
              key={journey.id}
              data-find-primary={primary === `journey:${journey.id}` || undefined}
              data-find-result={`journey:${journey.id}`}
              type="button"
              className="find-result find-story-result"
              onClick={() => choose(`journey:${journey.id}`, () => openJourney(journey.id))}
            >
              <StoryThumbnail id={journey.steps[0]!.id} />
              <span>
                {journey.title}
                <small>{journey.summary}</small>
              </span>
            </button>
          ))}
        </section>
      )}
      {!!places.length && (
        <section className="find-results" aria-label="Places">
          <h3>Places</h3>
          {places.map((place) => (
            <button
              type="button"
              className="find-result"
              key={place.name}
              data-find-primary={primary === `place:${place.name}` || undefined}
              data-find-result={`place:${place.name}`}
              onClick={() => choose(`place:${place.name}`, () => explore(place))}
            >
              <svg
                viewBox="0 0 20 20"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path d="M15.5 8c0 3.8-5.5 8-5.5 8S4.5 11.8 4.5 8a5.5 5.5 0 1 1 11 0Z" />
                <circle cx="10" cy="8" r="1.6" />
              </svg>
              <span>{place.name}</span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </section>
      )}
      {!!stories.length && (
        <section className="find-results" aria-label="Stories">
          <h3>Stories</h3>
          {stories.map((story) => {
            const reason = unavailable(story.id);
            return (
              <button
                key={story.id}
                data-find-primary={primary === `story:${story.id}` || undefined}
                aria-label={story.title}
                aria-description={reason ?? story.location ?? story.summary}
                data-find-result={`story:${story.id}`}
                type="button"
                className="find-result find-story-result"
                disabled={!!reason}
                onClick={() => choose(`story:${story.id}`, () => open(story.id))}
              >
                <StoryThumbnail id={story.id} />
                <span>
                  {story.title}
                  <small>{reason ?? story.location ?? story.summary}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            );
          })}
        </section>
      )}
    </dialog>,
    document.querySelector(".frame") ?? document.body,
  );
}
