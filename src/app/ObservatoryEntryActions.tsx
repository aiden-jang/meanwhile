import { useStoryNavigation } from "./journeys/StoryNavigation";
import { StoryThumbnail } from "./StoryThumbnail";
import { honoluluReading } from "./tonga/honolulu";
import "./landing-stories.css";

const reading = honoluluReading(false);
const tongaEntry = "open-landing-tonga";

export function LandingStories() {
  const navigation = useStoryNavigation();
  const unavailable = !navigation || !!navigation.unavailable(reading.id);
  return (
    <div className="landing-stories">
      <button
        type="button"
        id={tongaEntry}
        className="landing-story"
        aria-labelledby="landing-story-title"
        aria-describedby="landing-story-summary"
        disabled={unavailable}
        onClick={() =>
          navigation?.resume({ id: reading.id, seen: Date.now(), position: { moment: reading } }, tongaEntry)
        }
      >
        <StoryThumbnail id={reading.id} featured />
        <span className="landing-story-text">
          <strong id="landing-story-title">
            Tonga’s shockwave
            <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
              <path d="M3 10h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </strong>
          <small id="landing-story-summary">Scrub Honolulu’s pressure trace</small>
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
