import type { ObservatoryProps } from "../observatoryProps";
import { searchStories } from "../storyIndex";
import { captureCollection } from "../visitor/collectionReturn";
import { backToExplore, isWorldStoryMarker } from "../discovery/worldStoryMarker";
import { weatherOrigin } from "../storm/weatherHandoff";
import { auroraHandoff } from "./auroraJourney";
import type { BrowseOrigin } from "./storyNavigationTypes";
import { catalogueRowOffset, type PanelReturn } from "../panelReturn";

export function captureBrowseOrigin(
  { explorer, views }: ObservatoryProps,
  trigger: string,
  active: string | null,
  previous: BrowseOrigin | null,
  preview: Pick<BrowseOrigin, "camera" | "flat"> | null,
): BrowseOrigin | null {
  const collection = captureCollection(trigger);
  const fromStory =
    trigger.startsWith("related-story-") || ["open-observatory-find", "follow-nightfall"].includes(trigger);
  if (!collection && !fromStory && (active !== null || previous)) return previous;
  const scrollTarget = views.observing ? "observatory-intro" : "chrome-rail";
  const panel = document.getElementById(scrollTarget);
  const browsing = views.observing ? views.browser.open : views.browser.pane === "stories";
  return {
    route: views.navigation.capture(explorer.read()),
    camera: preview?.camera ?? explorer.read(),
    scroll: panel?.scrollTop ?? 0,
    rowOffset: catalogueRowOffset(panel, trigger),
    scrollTarget,
    flat: preview?.flat ?? explorer.flat,
    ...(collection ? { collection } : {}),
    ...(previous ? { previous } : {}),
    label:
      weatherOrigin(trigger) ??
      (isWorldStoryMarker(trigger)
        ? backToExplore
        : trigger === auroraHandoff
          ? "Back to the ISS finding"
          : collection
            ? "Back to Saved"
            : fromStory && active
              ? `Back to ${searchStories.find((item) => item.id === active)?.title ?? "previous story"}`
              : browsing
                ? "Back to stories"
                : views.observing
                  ? "Back to home"
                  : "Back to layers"),
    trigger,
  };
}

export function openStoryCatalogue(
  { views, onExplore }: ObservatoryProps,
  restore: (position: PanelReturn) => void,
  focusSearch: boolean,
  entry?: string,
) {
  const focus = focusSearch ? "story-search-input" : (entry ?? "explorer-stories-tab");
  views.navigation.requestExploreFocus(focus);
  if (focusSearch) {
    views.browser.scroll.current = 0;
    views.browser.select(null);
  }
  views.browser.fold("journeys", false);
  views.browser.show("stories");
  onExplore(true);
  restore({
    scrollTarget: "chrome-rail",
    scroll: views.browser.scroll.current,
    focus,
    fallback: "explorer-stories-tab",
  });
}
