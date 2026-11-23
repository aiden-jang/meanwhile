import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StoryThumbnail } from "../StoryThumbnail";
import { searchStories } from "../storyIndex";
import { savedVisitKey, type Library, type Visit } from "./library";
import { visitNote } from "./VisitShelf";
import { LayerIcon } from "../LayerIcon";
import { findObservatory, type ExploreTarget } from "./observatorySearch";

export function FindObservatory({
  onClose,
  open,
  explore,
  unavailable,
  library,
  openJourney,
  resume,
}: {
  onClose: () => void;
  open: (id: string) => void;
  explore: (target: ExploreTarget) => void;
  unavailable: (id: string) => string | null;
  library: Library;
  openJourney: (id: string) => void;
  resume: (visit: Visit, recent: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const panel = dialog.current!;
    panel.showModal();
    search.current?.focus();
    return () => panel.close();
  }, []);
  const results = findObservatory(query, library);
  const { places, stories, layers, journeys } = results;
  const typing = !!query.trim();
  const count =
    places.length +
    stories.length +
    layers.length +
    journeys.length +
    results.saved.length +
    results.recent.length;
  const choose = (next: () => void) => {
    dialog.current?.close();
    next();
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
          onInput={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            const options = Array.from(
              dialog.current?.querySelectorAll<HTMLButtonElement>(".find-result:enabled") ?? [],
            );
            const exact = options.find(
              (row) => row.dataset["findName"]?.toLowerCase() === query.trim().toLowerCase(),
            );
            (exact ?? options[0])?.click();
          }}
        />
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
                  disabled={!!unavailable(visit.id)}
                  onClick={() => choose(() => resume(visit, label === "Recent visits"))}
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
      {!!journeys.length && (
        <section className="find-results" aria-label="Journeys">
          <h3>Journeys</h3>
          {journeys.map((journey) => (
            <button
              key={journey.id}
              data-find-name={journey.title}
              type="button"
              className="find-result find-story-result"
              onClick={() => choose(() => openJourney(journey.id))}
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
              onClick={() => choose(() => explore(place))}
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
                data-find-name={story.title}
                type="button"
                className="find-result find-story-result"
                disabled={!!reason}
                onClick={() => choose(() => open(story.id))}
              >
                <StoryThumbnail id={story.id} />
                <span>
                  {story.title}
                  {reason && <small>{reason}</small>}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            );
          })}
        </section>
      )}
      {!!layers.length && (
        <section className="find-results" aria-label="Layers">
          <h3>Layers</h3>
          {layers.map((layer) => (
            <button
              type="button"
              className="find-result"
              key={layer.id}
              data-find-name={layer.name}
              onClick={() => choose(() => explore(layer))}
            >
              <LayerIcon layer={layer.id} />
              <span>{layer.name}</span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </section>
      )}
    </dialog>,
    document.querySelector(".frame") ?? document.body,
  );
}
