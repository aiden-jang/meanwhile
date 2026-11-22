import { visitAction } from "./visitAction";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { searchStories } from "../storyIndex";
import type { Visit } from "./library";
import { visitNote } from "./VisitShelf";

export function ContinueVisit({ visit }: { visit: Visit }) {
  const navigation = useStoryNavigation();
  if (!navigation) return null;
  const title = searchStories.find((story) => story.id === visit.id)!.title;
  const reason = navigation.unavailable(visit.id);
  const action = visitAction(visit);
  return (
    <button
      type="button"
      id={`continue-story-${visit.id}`}
      className="story-continue"
      disabled={!!reason}
      onClick={() => navigation.resume(visit, `continue-story-${visit.id}`, true)}
    >
      <span>
        {action} {title}
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M3 10h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <small>
        {reason ??
          (action === "Open latest"
            ? "Latest available data · source times shown inside"
            : action === "Watch again"
              ? "Start again from the beginning"
              : visitNote(visit))}
      </small>
    </button>
  );
}
