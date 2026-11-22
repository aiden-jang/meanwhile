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
import { riverBasins } from "../observations/riverGauges";
import "./fixed-journey.css";

export function hasFixedJourney(id: string | undefined) {
  return id === "ice-in-motion" || id === "water-in-motion";
}

const chapterTitles = new Map(searchStories.map(({ id, title }) => [id, title]));
const waterLabels = ["Forecast", "Satellite", "River gauge"];

const EndingTarget = createContext<HTMLElement | null>(null);

export function FixedJourneyLayout({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  return (
    <EndingTarget.Provider value={target}>
      <FixedJourney finale={setTarget} />
      {children}
    </EndingTarget.Provider>
  );
}

function FixedJourney({ finale }: { finale: (element: HTMLDivElement | null) => void }) {
  const navigation = useStoryNavigation();
  const route = navigation?.route;
  const journey = hasFixedJourney(route?.id) ? journeys.find(({ id }) => id === route?.id) : undefined;
  const current = route?.step ?? 0;
  const next = journey?.steps[current + 1];
  useEffect(() => warmJourneyStop(next?.id), [next]);
  if (!journey || !navigation || !route) return null;
  const chapters = journey.steps;
  const water = route.id === "water-in-motion";
  const moving = !!route.folding;
  const previous = chapters[current - 1];
  const riverChoice = water
    ? navigation.progressFor(route.id)?.stops.find(([step]) => step === 2)?.[1].visit.position.moment?.choice
    : undefined;
  const river = riverBasins.find(({ id }) => id === riverChoice)?.label.split(" · ")[0];
  const nextLabel = water
    ? current === 0
      ? "Open Rainbelt"
      : river && riverChoice !== "hudson"
        ? `Return to the ${river}`
        : "Go to the Hudson"
    : next
      ? `Next: ${chapterTitles.get(next.id)}`
      : undefined;
  const context = water
    ? ["Same Pacific coast", "A separate river gauge record", "Previous view restores your satellite frame"][
        current
      ]
    : moving
      ? "Leaving West Greenland…"
      : [
          "Next stop: West Greenland",
          "Next stop: a separate iceberg record near South Georgia",
          "Previous view restores your glacier reading",
        ][current];
  return (
    <section
      className="fixed-journey"
      aria-label="Current journey"
      data-water-step={water ? current : undefined}
    >
      <div className="fixed-journey-rail">
        <div className="fixed-journey-title">
          <h3>{journey.title}</h3>
          <span>
            {current + 1} of {chapters.length}
          </span>
        </div>
        <ol aria-label="Journey chapters">
          {chapters.map(({ id }, index) => (
            <li key={id}>
              <button
                type="button"
                aria-current={index === current ? "step" : undefined}
                aria-disabled={index === current || moving || !!navigation.unavailable(id)}
                onClick={() => {
                  if (index !== current && !moving) navigation.step(index);
                }}
              >
                <span aria-hidden="true">{!water && index + 1}</span>
                {water ? waterLabels[index] : chapterTitles.get(id)}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="fixed-journey-pager">
        {previous && (
          <button
            className="fixed-journey-previous"
            type="button"
            aria-disabled={moving || !!navigation.unavailable(previous.id)}
            onClick={() => {
              if (!moving) navigation.step(current - 1);
            }}
          >
            Previous view
          </button>
        )}
        <p aria-live="polite">{context}</p>
        {next && (
          <button
            className="fixed-journey-next"
            type="button"
            aria-disabled={moving || !!navigation.unavailable(next.id)}
            onClick={() => {
              if (!moving) navigation.step(current + 1);
            }}
          >
            {nextLabel}
          </button>
        )}
        {!next && <div className="fixed-journey-finale" ref={finale} />}
      </div>
    </section>
  );
}

export function FixedJourneyEnding({
  journey,
  canRead,
  ready,
  playing = false,
  replay,
  title,
  children,
  finishFocus,
}: {
  journey: "ice-in-motion" | "water-in-motion";
  canRead: boolean;
  ready: boolean;
  playing?: boolean;
  replay?: () => void;
  title: string;
  children: ReactNode;
  finishFocus: string;
}) {
  const navigation = useStoryNavigation();
  const target = useContext(EndingTarget);
  const [shown, setShown] = useState(false);
  const ending = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (!shown) return;
    ending.current?.focus({ preventScroll: true });
    revealReading(ending.current, journey === "water-in-motion" ? "start" : "nearest");
  }, [shown, journey]);
  if (navigation?.route?.id !== journey) return null;
  const name = journey === "water-in-motion" ? "Water in Motion" : "Ice in Motion";
  return (
    <>
      {target &&
        createPortal(
          <button
            type="button"
            className="fixed-journey-next"
            aria-disabled={!ready || playing}
            aria-expanded={canRead ? shown : undefined}
            onClick={() => {
              if (!ready || playing) return;
              if (!canRead) {
                replay?.();
                return;
              }
              if (shown) {
                ending.current?.focus({ preventScroll: true });
                revealReading(ending.current, journey === "water-in-motion" ? "start" : "nearest");
              } else setShown(true);
            }}
          >
            {canRead ? "See the finding" : playing ? "Watching the breakup…" : "Watch the breakup"}
          </button>,
          target,
        )}
      {shown && (
        <section className="story-finding" aria-label={`${name} finding`}>
          <h3 ref={ending} tabIndex={-1}>
            {title}
          </h3>
          {children}
          <button
            type="button"
            onClick={() => {
              navigation.finish(true);
              requestAnimationFrame(() =>
                document.querySelector<HTMLElement>(finishFocus)?.focus({ preventScroll: true }),
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
