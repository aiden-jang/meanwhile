import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { FindObservatory } from "./visitor/FindObservatory";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import { SavedBoundary, SavedPanel } from "./visitor/SavedBoundary";
import "./header-navigation.css";
import "./visitor/saved-collection.css";

const loadCollection = () => import("./visitor/SavedCollection");
const warmCollection = () => {
  void loadCollection().catch(() => {});
};
const SavedCollection = lazy(() => loadCollection().then((module) => ({ default: module.SavedCollection })));

const playingSelector = ".story-playback:not([data-playback-start]), .sun-transport [data-story-playing]";

export function HeaderNavigation({ exploring }: { exploring: boolean }) {
  const navigation = useStoryNavigation();
  const [opened, setSaved] = useState(false);
  const [finding, setFind] = useState(false);
  const findTrigger = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const savedTrigger = useRef<HTMLElement | null>(null);
  const heldPlayback = useRef<HTMLButtonElement | undefined>();
  useEffect(() => setSaved(false), [navigation?.active, navigation?.browsingStories]);
  if (!navigation) return null;
  const find = finding || !!navigation.restoredFind;
  const saved = opened || !!navigation.restoredCollection;
  const holdPlayback = () => {
    heldPlayback.current = [...document.querySelectorAll<HTMLButtonElement>(playingSelector)].find(
      (button) =>
        !button.disabled &&
        button.getClientRects().length > 0 &&
        getComputedStyle(button).visibility === "visible",
    );
    heldPlayback.current?.click();
  };
  const resumePlayback = () => {
    const playback = heldPlayback.current;
    heldPlayback.current = undefined;
    if (playback?.isConnected && !playback.disabled && !playback.matches(playingSelector)) playback.click();
  };
  const closeFind = () => {
    setFind(false);
    navigation.dismissFind();
    requestAnimationFrame(() => {
      resumePlayback();
      findTrigger.current?.focus({ preventScroll: true });
    });
  };
  const close = (departing = false) => {
    if (departing) heldPlayback.current = undefined;
    else resumePlayback();
    document.querySelector<HTMLDialogElement>("#saved-observations")?.close();
    navigation.dismissRestoration();
    setSaved(false);
    (savedTrigger.current ?? trigger.current)?.focus({ preventScroll: true });
  };
  return (
    <>
      <button
        type="button"
        className="header-navigation-action header-explore"
        aria-label="Explore"
        aria-current={exploring && !navigation.browsingStories ? "location" : undefined}
        aria-description="Browse live layers on the globe or map"
        onClick={() => {
          setSaved(false);
          navigation.dismissRestoration();
          navigation.explore();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
        </svg>
        <span>Explore</span>
      </button>
      <button
        type="button"
        className="header-navigation-action header-find"
        ref={findTrigger}
        id="open-observatory-find"
        aria-label="Find"
        aria-expanded={find}
        aria-haspopup="dialog"
        onClick={() => {
          setSaved(false);
          navigation.dismissRestoration();
          holdPlayback();
          setFind(true);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m15 15 6 6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>Find</span>
      </button>
      <button
        ref={trigger}
        id="open-saved-observations"
        type="button"
        className="header-navigation-action"
        aria-label="Saved observations and recent visits"
        aria-expanded={saved}
        aria-controls={saved ? "saved-observations" : undefined}
        onPointerEnter={warmCollection}
        onFocus={warmCollection}
        onClick={() => {
          if (saved) return close();
          savedTrigger.current =
            document.getElementById("open-catalogue-saved") === document.activeElement
              ? (document.activeElement as HTMLElement)
              : trigger.current;
          holdPlayback();
          setSaved(true);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 3h12v18l-6-4-6 4Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>Saved</span>
      </button>
      {find && (
        <FindObservatory
          position={navigation.restoredFind}
          launch={navigation.launchFromFind}
          unavailable={navigation.unavailable}
          library={navigation.library}
          openEntrance={(id) => {
            heldPlayback.current = undefined;
            setFind(false);
            navigation.openEntrance(id);
          }}
          openJourney={(id) => {
            heldPlayback.current = undefined;
            setFind(false);
            if (navigation.progressFor(id)) navigation.continueJourney(id, "open-observatory-find");
            else navigation.start(id, "open-observatory-find");
          }}
          resume={(visit, recent) => {
            heldPlayback.current = undefined;
            setFind(false);
            navigation.resume(visit, "open-observatory-find", recent);
          }}
          onClose={closeFind}
          explore={(target) => {
            heldPlayback.current = undefined;
            setFind(false);
            navigation.dismissFind();
            navigation.findTarget(target);
          }}
          open={(id) => {
            if (id === navigation.active) return closeFind();
            heldPlayback.current = undefined;
            setFind(false);
            navigation.open(id, "open-observatory-find");
          }}
        />
      )}
      {saved && (
        <SavedPanel count={navigation.library.saved.length} onClose={() => close()}>
          <SavedBoundary>
            <Suspense
              fallback={
                <div className="saved-pending" role="status">
                  Opening saved readings…
                </div>
              }
            >
              <SavedCollection onClose={() => close(true)} />
            </Suspense>
          </SavedBoundary>
        </SavedPanel>
      )}
    </>
  );
}
