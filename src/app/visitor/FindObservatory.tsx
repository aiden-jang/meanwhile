import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StoryThumbnail } from "../StoryThumbnail";
import { LayerIcon } from "../LayerIcon";
import { findObservatory, type ExploreTarget } from "./observatorySearch";

export function FindObservatory({
  onClose,
  open,
  explore,
  unavailable,
}: {
  onClose: () => void;
  open: (id: string) => void;
  explore: (target: ExploreTarget) => void;
  unavailable: (id: string) => string | null;
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
  const { places, stories, layers } = findObservatory(query);
  const count = places.length + stories.length + layers.length;
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
            dialog.current?.querySelector<HTMLButtonElement>(".find-result:enabled")?.click();
          }}
        />
      </div>
      <p className="sr-only" role="status">
        {query.trim() ? `${count} ${count === 1 ? "result" : "results"}` : ""}
      </p>
      {query.trim() && !count && (
        <p className="find-empty">No matches. Try a featured city, a story subject, or a layer name.</p>
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
