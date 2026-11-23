import { APRIL_ECLIPSE_DAY } from "../geo/aprilEclipse";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import type { ObservatoryProps } from "./observatoryProps";

export function EarthquakeDiscovery({ context }: { context: ObservatoryProps }) {
  const navigation = useStoryNavigation();
  return (
    <div className="story-archive-actions">
      <details className="context-fold">
        <summary className="disclose text-dim">Archives</summary>
        <button type="button" onClick={() => context.onHistory("2011-03-11")}>
          Japan, 2011
        </button>
        <button type="button" onClick={() => context.onHistory("2013-05-24")}>
          Deep beneath Okhotsk
        </button>
        <button type="button" onClick={() => context.onHistory(APRIL_ECLIPSE_DAY)}>
          Total eclipse, 2024
        </button>
        <button type="button" onClick={context.explorePaths.pickDate}>
          Pick a past date
        </button>
      </details>
      <button
        type="button"
        id="start-story-tour"
        ref={context.tour.button}
        disabled={!context.tour.available || !context.ready}
        onClick={() => navigation?.tour()}
      >
        Earthquake tour
      </button>
    </div>
  );
}
