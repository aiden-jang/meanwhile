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
import { auroraChapters, auroraJourney } from "./auroraJourney";
import "./fixed-journey.css";

type FixedJourneyId =
  "ice-in-motion" | "water-in-motion" | "reading-the-coast" | "above-earth" | typeof auroraJourney;

export function hasFixedJourney(id: string | undefined): id is FixedJourneyId {
  return (
    id === "ice-in-motion" ||
    id === "water-in-motion" ||
    id === "reading-the-coast" ||
    id === "above-earth" ||
    id === auroraJourney
  );
}

const coastChapters = [
  { label: "New land", path: "m2 13 7-7 2 2 5-5M5 14l4-4 2 2 5-5" },
  { label: "Passing wave", path: "M1 9h2c2.5 0 2-4 4.5-4s2 8 4.5 8 2.5-4 4-4h1" },
  { label: "Daily tide", path: "M2 7c4 0 3 5 7 5s3-5 7-5M2 11c4 0 3 5 7 5s3-5 7-5" },
];

const skyChapters = [
  { label: "City sky", path: "M2 14c4-4 10-4 14 0M9 2v5M6.5 4.5h5M4 7v3M2.5 8.5h3" },
  { label: "Apollo 17", path: "M14.8 12.4A6.6 6.6 0 0 1 6.4 3.5 6.4 6.4 0 1 0 14.8 12.4Z" },
  { label: "ISS pass", path: "M3 14C7 7 10 4 16 4m-3-1-1 4m-3-2 4 1" },
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
  const sky = route.id === "above-earth";
  const aurora = route.id === auroraJourney;
  const fromPass = aurora && navigation.auroraFromPass;
  const illustrated = sky ? skyChapters : coast ? coastChapters : aurora ? auroraChapters : undefined;
  const city = navigation.previewCity.name;
  const passCity = sky
    ? (navigation.progressFor(route.id)?.stops.find(([index]) => index === 2)?.[1].visit.position.moment
        ?.city ?? city)
    : city;
  const skyNext =
    current === 0
      ? navigation.moonAboveHorizon === false
        ? "Visit Apollo 17"
        : "Approach the Moon"
      : `Back to ${passCity}`;
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
  const nextLabel = aurora
    ? ["Read the solar wind", "Follow magnetic north"][current]
    : sky
      ? skyNext
      : coast
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
  const context = aurora
    ? moving
      ? "Return to Earth…"
      : ["NOAA forecast", "Separate forecast and measurement times", `${city} · Magnetic field model`][
          current
        ]
    : sky
      ? ["From your sky to the lunar surface", "Return to your city horizon", `${city} · Local time`][current]
      : coast
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
      data-sky-step={sky ? current : undefined}
      data-aurora-step={aurora ? current : undefined}
      data-aurora-leaving={route.folding === "solar" || undefined}
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
                aria-disabled={index === current || moving || !!navigation.stepUnavailable(index)}
                onClick={() => {
                  if (index !== current && !moving) navigation.step(index);
                }}
              >
                {illustrated ? (
                  <svg
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d={illustrated[index]!.path} />
                  </svg>
                ) : (
                  <span aria-hidden="true">{!water && index + 1}</span>
                )}
                {illustrated?.[index]?.label ?? (water ? waterLabels[index] : chapterTitles.get(id))}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="fixed-journey-pager">
        {(previous || fromPass) && (
          <button
            className="fixed-journey-previous"
            type="button"
            aria-disabled={moving || !!navigation.stepUnavailable(current - 1)}
            onClick={() => {
              if (moving) return;
              if (previous) navigation.step(current - 1);
              else navigation.returnToBrowse();
            }}
          >
            {previous ? "Previous view" : "ISS finding"}
          </button>
        )}
        <p aria-live="polite">{context}</p>
        {next && (
          <button
            className="fixed-journey-next"
            type="button"
            aria-disabled={moving || !!navigation.stepUnavailable(current + 1)}
            onClick={() => {
              if (!moving) navigation.step(current + 1);
            }}
          >
            {nextLabel}
          </button>
        )}
        {!next &&
          (aurora ? (
            <button
              type="button"
              className="fixed-journey-next"
              onClick={() => {
                if (fromPass) navigation.returnToBrowse();
                else navigation.finish(true);
              }}
            >
              {fromPass ? "Return to the ISS view" : "Finish journey"}
            </button>
          ) : (
            <div className="fixed-journey-finale" ref={finale} />
          ))}
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
  playLabel = "Watch the breakup",
  playingLabel = "Watching the breakup…",
  initialOpen = false,
  onReveal,
}: {
  journey: FixedJourneyId;
  canRead: boolean;
  ready: boolean;
  playing?: boolean;
  replay?: () => void;
  title: string;
  children: ReactNode;
  finishFocus: string;
  playLabel?: string;
  playingLabel?: string;
  initialOpen?: boolean;
  onReveal?: () => void;
}) {
  const navigation = useStoryNavigation();
  const target = useContext(EndingTarget);
  const [shown, setShown] = useState(initialOpen);
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
              } else {
                onReveal?.();
                setShown(true);
              }
            }}
          >
            {canRead ? "See the finding" : playing ? playingLabel : playLabel}
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
