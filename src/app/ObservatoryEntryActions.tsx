import { useStoryNavigation } from "./journeys/StoryNavigation";
import type { PacificEntry } from "./pacific/usePacificDescent";
import waterline from "./pacific/pacific-thumbnail.webp";
import "./landing-stories.css";

export function LandingStories({ pacific, ready }: { pacific: PacificEntry; ready: boolean }) {
  const navigation = useStoryNavigation();
  return (
    <div className="landing-stories">
      <button
        type="button"
        id="open-pacific-descent"
        className="landing-story"
        aria-labelledby="landing-story-title"
        aria-describedby="landing-story-summary"
        aria-busy={pacific.loading || undefined}
        aria-disabled={pacific.loading || undefined}
        disabled={!ready}
        onClick={(event) => pacific.open(event.currentTarget)}
      >
        <img className="story-thumbnail" src={waterline} alt="" width="58" height="46" />
        <span className="landing-story-text">
          <strong id="landing-story-title">Through the Pacific</strong>
          <small id="landing-story-summary" role="status">
            {pacific.status || "From orbit to the seafloor"}
          </small>
        </span>
      </button>
      <button type="button" id="browse-stories" onClick={() => navigation?.browse(true)}>
        All stories
      </button>
    </div>
  );
}

export function ObservatoryEntryActions({ explore, browse }: { explore: () => void; browse: () => void }) {
  return (
    <div className="observatory-actions observatory-entry-actions">
      <button type="button" className="observatory-primary" onClick={explore}>
        Explore the globe
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="m5 15 10-10M5 5h10v10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <button type="button" id="browse-stories" onClick={browse}>
        Browse stories
      </button>
    </div>
  );
}
