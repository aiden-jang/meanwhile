import { useReadingArrival } from "./useReadingArrival";
import { useRef, type ReactNode } from "react";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import { ContinueVisit } from "./visitor/ContinueVisit";
import { JourneyPicker } from "./journeys/JourneyPicker";
import { StoryRow } from "./StoryRow";
import type { EarthScene, useObservatory } from "./useObservatory";
import { resetStoryResults, StorySearch } from "./StorySearch";
import { StoryPreview } from "./discovery/StoryPreview";
import { FeaturedStory } from "./FeaturedStory";
import { browseStories, featuredStoryId, storyButtonId } from "./storyBrowse";
import { inStoryTopic, searchStories } from "./storyIndex";
import { StoryCatalogue } from "./StoryCatalogue";
import "./stories.css";

type Observatory = ReturnType<typeof useObservatory>;
export function StoriesDrawer({
  scene,
  visible = true,
  ready,
  observations: deck,
  onSelect,
  onDismiss,
  discoveries,
  filter,
  sceneEntry,
  browse,
}: {
  discoveries?: ReactNode;
  filter?: ReactNode;
  sceneEntry?: ReactNode;
  browse: Pick<Observatory["browser"], "expanded" | "sections" | "expand" | "fold" | "select">;
  visible?: boolean;
  scene: EarthScene | null;
  ready: boolean;
  observations: Observatory["observations"];
  onSelect: () => void;
  onDismiss: () => void;
}) {
  const navigation = useStoryNavigation();
  const { expanded, expand } = browse;
  const key = scene ?? "all";
  const all = scene !== null && expanded === key;
  const featured = featuredStoryId(scene);
  const showJourneys = browse.sections.includes("journeys");
  const journeyStops = scene ? undefined : navigation?.journeyProgress?.stops;
  const recent = all
    ? undefined
    : navigation?.library.recent.find(
        ({ id }) =>
          !journeyStops?.some(([, stop]) => stop.visit.id === id) &&
          searchStories.some((story) => story.id === id && inStoryTopic(story, scene)),
      );
  const entries = browseStories(scene, all).filter(({ id }) => id !== recent?.id);
  const featuredRow =
    recent && recent.id !== featured ? searchStories.find(({ id }) => id === featured) : null;
  if (featuredRow) entries.unshift(featuredRow);
  const selectionScroll = useRef(0);
  const journeyScroll = useRef(0);
  const container = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const fullHeading = useRef<HTMLHeadingElement>(null);
  useReadingArrival(results, `${key}:${all}`, "fade");
  const rail = () => container.current?.closest<HTMLElement>("#chrome-rail, #observatory-intro");
  const toggleJourneys = () => {
    if (!showJourneys) journeyScroll.current = rail()?.scrollTop ?? 0;
    browse.fold("journeys", !showJourneys);
    requestAnimationFrame(() => rail()?.scrollTo({ top: showJourneys ? journeyScroll.current : 0 }));
  };
  if (!visible) return null;
  return (
    <StoryPreview
      scope={`${key}:${deck.query}`}
      region={deck.query.trim() || (scene === null && !navigation?.previewMap) ? undefined : scene}
    >
      <div
        ref={container}
        id="stories-panel"
        className="stories-drawer"
        aria-label="Story catalogue"
        role="region"
        onClickCapture={onSelect}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          if (showJourneys) {
            toggleJourneys();
            document.getElementById("journeys-toggle")?.focus({ preventScroll: true });
          } else if (deck.query) {
            resetStoryResults(event.currentTarget);
            deck.setQuery("");
            container.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus({
              preventScroll: true,
            });
          } else onDismiss();
        }}
      >
        <div className="story-selection-heading">
          <h2 id="story-selection-title" tabIndex={-1}>
            {deck.query.trim()
              ? scene
                ? `Search ${{ live: "Earth", depth: "Below the Surface", night: "After Dark" }[scene]}`
                : "Search all stories"
              : scene
                ? { live: "Earth", depth: "Below the Surface", night: "After Dark" }[scene]
                : "All stories"}
          </h2>
          {scene && !deck.query.trim() && (
            <button
              type="button"
              onClick={() => {
                browse.select(null);
                requestAnimationFrame(() =>
                  document.getElementById("story-selection-title")?.focus({ preventScroll: true }),
                );
              }}
            >
              Show all
            </button>
          )}
        </div>
        <StorySearch
          deck={deck}
          ready={ready}
          scene={scene}
          filter={filter}
          results={results}
          onSearchAll={() => browse.select(null)}
          showJourneys={showJourneys}
          onSearch={() => browse.fold("journeys", false)}
          journeyControl={
            <button
              type="button"
              id="journeys-toggle"
              data-journey-control=""
              className="story-journey-toggle"
              aria-expanded={showJourneys}
              aria-controls="journeys-panel"
              onClick={toggleJourneys}
            >
              Journeys
            </button>
          }
        >
          <div id="journeys-panel" hidden={!showJourneys}>
            {showJourneys && <JourneyPicker />}
          </div>
          {!deck.query.trim() && !showJourneys && (
            <>
              {sceneEntry}
              {scene === null ? (
                <StoryCatalogue ready={ready} recent={recent} />
              ) : (
                <>
                  {!all && (recent ? <ContinueVisit visit={recent} /> : <FeaturedStory scene={scene} />)}
                  <section className="stories-group" aria-label={all ? "All stories" : "Selected stories"}>
                    <h3
                      className={all ? undefined : "sr-only"}
                      ref={fullHeading}
                      tabIndex={all ? -1 : undefined}
                    >
                      {all ? "All stories" : "Start exploring"}
                    </h3>
                    <div>
                      {entries.map((story) => {
                        const id = storyButtonId(story.id);
                        return (
                          <StoryRow
                            key={story.id}
                            story={story}
                            buttonId={id}
                            ready={ready}
                            unavailable={navigation?.unavailable(story.id)}
                            open={() => navigation?.open(story.id, id, !!scene)}
                          />
                        );
                      })}
                    </div>
                    <div className="story-browse-footer">
                      <button
                        className="story-browse-all"
                        type="button"
                        aria-expanded={all}
                        onClick={() => {
                          if (!all) selectionScroll.current = rail()?.scrollTop ?? 0;
                          expand(all ? null : key);
                          requestAnimationFrame(() => {
                            rail()?.scrollTo({ top: all ? selectionScroll.current : 0 });
                            if (!all) fullHeading.current?.focus({ preventScroll: true });
                          });
                        }}
                      >
                        {all ? "Show highlights" : `View all ${browseStories(scene, true).length} stories`}
                      </button>
                      <button
                        type="button"
                        className="story-library-toggle"
                        id="open-catalogue-saved"
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          event.currentTarget.focus({ preventScroll: true });
                          document.getElementById("open-saved-observations")?.click();
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path
                            d="M12 5v15m0-15C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                        Saved &amp; recent
                      </button>
                    </div>
                  </section>
                </>
              )}
              {discoveries && (
                <details
                  className="story-today"
                  open={browse.sections.includes("feeds")}
                  onToggle={(event) => browse.fold("feeds", event.currentTarget.open)}
                >
                  <summary>From today’s feeds</summary>
                  {discoveries}
                </details>
              )}
            </>
          )}
        </StorySearch>
      </div>
    </StoryPreview>
  );
}
