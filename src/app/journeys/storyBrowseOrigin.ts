import type { ObservatoryProps } from "../observatoryProps";
import { searchStories } from "../storyIndex";
import { captureCollection } from "../visitor/collectionReturn";
import { weatherOrigin } from "../storm/weatherHandoff";
import { auroraHandoff } from "./auroraJourney";
import type { BrowseOrigin } from "./storyNavigationTypes";

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
  const browsing = views.observing ? views.browser.open : views.browser.pane === "stories";
  return {
    route: views.navigation.capture(explorer.read()),
    camera: preview?.camera ?? explorer.read(),
    scroll: document.getElementById(scrollTarget)?.scrollTop ?? 0,
    scrollTarget,
    flat: preview?.flat ?? explorer.flat,
    ...(collection ? { collection } : {}),
    ...(previous ? { previous } : {}),
    label:
      weatherOrigin(trigger) ??
      (trigger === auroraHandoff
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
