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
import { goldenGate, tidePorts } from "./coastRoute";
import { riverBasins } from "../observations/riverGauges";
import "./fixed-journey.css";

type FixedJourneyId = "ice-in-motion" | "water-in-motion" | "reading-the-coast";

export function hasFixedJourney(id: string | undefined): id is FixedJourneyId {
  return id === "ice-in-motion" || id === "water-in-motion" || id === "reading-the-coast";
}

const coastChapters = [
  { label: "New land", path: "m2 13 7-7 2 2 5-5M5 14l4-4 2 2 5-5" },
  { label: "Passing wave", path: "M1 9h2c2.5 0 2-4 4.5-4s2 8 4.5 8 2.5-4 4-4h1" },
  { label: "Daily tide", path: "M2 7c4 0 3 5 7 5s3-5 7-5M2 11c4 0 3 5 7 5s3-5 7-5" },
];

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
  const coast = route.id === "reading-the-coast";
  const moving = !!route.folding;
  const previous = chapters[current - 1];
  const riverChoice = water
    ? navigation.progressFor(route.id)?.stops.find(([step]) => step === 2)?.[1].visit.position.moment?.choice
    : undefined;
  const river = riverBasins.find(({ id }) => id === riverChoice)?.label.split(" · ")[0];
  const harborChoice = coast
    ? navigation.progressFor(route.id)?.stops.find(([step]) => step === 2)?.[1].visit.position.moment?.choice
    : undefined;
  const harbor = tidePorts.find(({ id }) => id === harborChoice);
  const coastNext =
    current === 0
      ? "Open the Chile record"
      : harbor && harbor.id !== goldenGate.id
        ? "Return to harbor"
        : "Go to San Francisco";
  const nextLabel = coast
    ? coastNext
    : water
      ? current === 0
        ? "Open Rainbelt"
        : river && riverChoice !== "hudson"
          ? `Return to the ${river}`
          : "Go to the Hudson"
      : next
        ? `Next: ${chapterTitles.get(next.id)}`
        : undefined;
  const context = coast
    ? ["A separate event in the Pacific", "A separate harbor record", "Compare your three views"][current]
    : water
      ? [
          "Same Pacific coast",
          "A separate river gauge record",
          "Previous view restores your satellite frame",
        ][current]
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
      data-coast-step={coast ? current : undefined}
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
                {coast ? (
                  <svg
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d={coastChapters[index]!.path} />
                  </svg>
                ) : (
                  <span aria-hidden="true">{!water && index + 1}</span>
                )}
                {coast ? coastChapters[index]!.label : water ? waterLabels[index] : chapterTitles.get(id)}
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
  journey: FixedJourneyId;
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
    revealReading(ending.current, journey === "ice-in-motion" ? "nearest" : "start");
  }, [shown, journey]);
  if (navigation?.route?.id !== journey) return null;
  const name = journeys.find(({ id }) => id === journey)?.title;
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
                revealReading(ending.current, journey === "ice-in-motion" ? "nearest" : "start");
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
