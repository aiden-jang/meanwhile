import { firstFloatProfile } from "./float/firstProfile";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import { StoryRow } from "./StoryRow";
import { StoryThumbnail } from "./StoryThumbnail";
import { browseStories, storyButtonId, storyKind } from "./storyBrowse";
import { ContinueVisit } from "./visitor/ContinueVisit";
import type { Visit, VisitPosition } from "./visitor/library";
import "./story-catalogue.css";

const picks = [
  { id: "float", title: "Float Dive", promise: "Ride an Argo float to the surface." },
  { id: "moonfall", title: "Moonfall", promise: "Land in the Apollo 17 valley." },
  { id: "kilauea", title: "Kīlauea", promise: "See how lava redrew the coast." },
] as const;
const catalogueLeads: Record<string, [number, string]> = {
  tonga: [1, "Atmospheric pressure · Pacific Ocean"],
  rupture: [2, "Recorded shaking · Tōhoku"],
  katrina: [3, "Hurricane Katrina · Gulf of Mexico"],
  megaflash: [4, "Satellite lightning detections"],
  sky: [5, "Moon and planets above your city"],
};
const otherStories = browseStories(null, true)
  .filter(({ id }) => !picks.some((pick) => pick.id === id))
  .sort((left, right) => (catalogueLeads[left.id]?.[0] ?? 6) - (catalogueLeads[right.id]?.[0] ?? 6));

function opening(id: (typeof picks)[number]["id"], map: boolean): VisitPosition {
  switch (id) {
    case "float":
      return { float: { profile: `recorded/${firstFloatProfile.id}`, index: 0, map } };
    case "kilauea":
      return { moment: { id, map, chapter: "compare" } };
    case "moonfall":
      return {};
  }
}

export function StoryCatalogue({ ready, recent }: { ready: boolean; recent: Visit | undefined }) {
  const navigation = useStoryNavigation();
  return (
    <>
      {recent && <ContinueVisit visit={recent} />}
      <section className="catalogue-picks" aria-labelledby="catalogue-picks-title">
        <header className="catalogue-picks-heading">
          <h3 id="catalogue-picks-title">Start here</h3>
          <button
            type="button"
            onClick={() => {
              const heading = document.getElementById("catalogue-more-title");
              heading?.scrollIntoView({ block: "start" });
              heading?.focus({ preventScroll: true });
            }}
          >
            More stories
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M10 3v13m-5-5 5 5 5-5" stroke="currentColor" fill="none" strokeWidth="1.5" />
            </svg>
          </button>
        </header>
        {picks.map(({ id, title, promise }) => {
          const buttonId = storyButtonId(id);
          const unavailable = navigation?.unavailable(id);
          return (
            <button
              key={id}
              type="button"
              className="catalogue-pick"
              id={buttonId}
              aria-labelledby={`${buttonId}-title`}
              aria-describedby={`${buttonId}-note`}
              disabled={!ready || !!unavailable}
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                navigation?.resume(
                  { id, seen: Date.now(), position: opening(id, navigation.previewMap) },
                  buttonId,
                );
              }}
            >
              <StoryThumbnail id={id} />
              <span>
                <strong id={`${buttonId}-title`}>{title}</strong>
                <small id={`${buttonId}-note`}>{unavailable ?? promise}</small>
              </span>
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M3 10h13m-5-5 5 5-5 5" stroke="currentColor" fill="none" strokeWidth="1.5" />
              </svg>
            </button>
          );
        })}
      </section>
      <section className="stories-group catalogue-more" aria-labelledby="catalogue-more-title">
        <h3 id="catalogue-more-title" tabIndex={-1}>
          More stories
        </h3>
        {otherStories.map((story) => {
          const id = storyButtonId(story.id);
          return (
            <StoryRow
              key={story.id}
              story={story}
              buttonId={id}
              ready={ready}
              unavailable={navigation?.unavailable(story.id)}
              caption={catalogueLeads[story.id]?.[1] ?? storyKind(story.id)}
              open={() => navigation?.open(story.id, id)}
            />
          );
        })}
      </section>
    </>
  );
}
