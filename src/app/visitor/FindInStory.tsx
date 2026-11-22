import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findStories } from "../storyIndex";
import { StoryThumbnail } from "../StoryThumbnail";

export function FindInStory({
  onClose,
  open,
  unavailable,
}: {
  onClose: () => void;
  open: (id: string) => void;
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
  const matches = findStories(query, null);
  return createPortal(
    <dialog
      ref={dialog}
      id="find-in-story"
      className="saved-collection"
      aria-labelledby="find-in-story-title"
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
        <h2 id="find-in-story-title">Find a story</h2>
        <button type="button" aria-label="Close Find" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="story-search explorer-search">
        <input
          ref={search}
          type="search"
          aria-label="Search all stories"
          placeholder="Search by story, place or subject…"
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
      </div>
      {query.trim() && !matches.length && <p role="status">No matches. Try a place, year or subject.</p>}
      {matches.map((story) => (
        <button
          key={story.id}
          type="button"
          className="find-story-result"
          disabled={!!unavailable(story.id)}
          onClick={() => open(story.id)}
        >
          <StoryThumbnail id={story.id} />
          <span>{story.title}</span>
          <span aria-hidden="true">→</span>
        </button>
      ))}
    </dialog>,
    document.querySelector(".frame") ?? document.body,
  );
}
