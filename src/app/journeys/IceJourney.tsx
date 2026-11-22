import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { revealReading } from "../observations/revealReading";
import { searchStories } from "../storyIndex";
import { journeys } from "./catalogue";
import { useStoryNavigation } from "./StoryNavigation";
import { warmJourneyStop } from "./warmJourneyStop";
import "./ice-journey.css";

const journey = journeys.find(({ id }) => id === "ice-in-motion")!;
const chapters = journey.steps.map(({ id }) => searchStories.find((story) => story.id === id)!);

const EndingTarget = createContext<HTMLElement | null>(null);

export function IceJourneyLayout({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  return (
    <EndingTarget.Provider value={target}>
      <IceJourney finale={setTarget} />
      {children}
    </EndingTarget.Provider>
  );
}

function IceJourney({ finale }: { finale: (element: HTMLDivElement | null) => void }) {
  const navigation = useStoryNavigation();
  const route = navigation?.route;
  const current = route?.id === journey.id ? route.step : undefined;
  const next = current === undefined ? undefined : chapters[current + 1];
  useEffect(() => warmJourneyStop(next?.id), [next]);
  if (current === undefined || !navigation || !route) return null;
  const moving = !!route.folding;
  const previous = chapters[current - 1];
  return (
    <section className="ice-journey" aria-label="Current journey">
      <div className="ice-journey-rail">
        <div className="ice-journey-title">
          <h3>{journey.title}</h3>
          <span>
            {current + 1} of {chapters.length}
          </span>
        </div>
        <ol aria-label="Journey chapters">
          {chapters.map(({ id, title }, index) => (
            <li key={id}>
              <button
                type="button"
                aria-current={index === current ? "step" : undefined}
                aria-disabled={index === current || moving || !!navigation.unavailable(id)}
                onClick={() => {
                  if (index !== current && !moving) navigation.step(index);
                }}
              >
                <span aria-hidden="true">{index + 1}</span>
                {title}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="ice-journey-pager">
        {previous && (
          <button
            className="ice-journey-previous"
            type="button"
            aria-disabled={moving || !!navigation.unavailable(previous.id)}
            onClick={() => {
              if (!moving) navigation.step(current - 1);
            }}
          >
            Previous view
          </button>
        )}
        <p aria-live="polite">
          {moving
            ? "Leaving West Greenland…"
            : current === 0
              ? "Next stop: West Greenland"
              : current === 1
                ? "Next stop: a separate iceberg record near South Georgia"
                : "Previous view restores your glacier reading"}
        </p>
        {next && (
          <button
            className="ice-journey-next"
            type="button"
            aria-disabled={moving || !!navigation.unavailable(next.id)}
            onClick={() => {
              if (!moving) navigation.step(current + 1);
            }}
          >
            Next: {next.title}
          </button>
        )}
        {!next && <div className="ice-journey-finale" ref={finale} />}
      </div>
    </section>
  );
}

export function IceJourneyEnding({
  canRead,
  ready,
  playing,
  replay,
}: {
  canRead: boolean;
  ready: boolean;
  playing: boolean;
  replay: () => void;
}) {
  const navigation = useStoryNavigation();
  const target = useContext(EndingTarget);
  const [shown, setShown] = useState(false);
  const ending = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (!shown) return;
    ending.current?.focus({ preventScroll: true });
    revealReading(ending.current);
  }, [shown]);
  if (navigation?.route?.id !== journey.id) return null;
  return (
    <>
      {target &&
        createPortal(
          <button
            type="button"
            className="ice-journey-next"
            aria-disabled={!ready || playing}
            onClick={() => {
              if (!ready || playing) return;
              if (canRead) {
                if (shown) {
                  ending.current?.focus({ preventScroll: true });
                  revealReading(ending.current);
                } else setShown(true);
              } else replay();
            }}
          >
            {canRead ? "See the finding" : playing ? "Watching the breakup…" : "Watch the breakup"}
          </button>,
          target,
        )}
      {shown && (
        <section className="story-finding" aria-label="Ice in Motion finding">
          <h3 ref={ending} tabIndex={-1}>
            Three ways ice moves
          </h3>
          <p>
            Sea ice retreats seasonally. Land ice flows toward the coast. Once afloat, pieces of an iceberg
            can take separate paths.
          </p>
          <button
            type="button"
            onClick={() => {
              navigation.finish(true);
              requestAnimationFrame(() =>
                document.querySelector<HTMLElement>(".iceberg-reading h3")?.focus({ preventScroll: true }),
              );
            }}
          >
            Finish journey
          </button>
        </section>
      )}
    </>
  );
}
