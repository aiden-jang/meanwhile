import { FixedJourneyEnding } from "./FixedJourney";
import { useStoryNavigation } from "./StoryNavigation";
import { useStorySession } from "../observations/StorySession";
import { auroraHandoff, auroraJourney } from "./auroraJourney";

export function NightPassFinding({
  city,
  ready,
  hasPass,
  watched = false,
  watching = false,
  watch,
}: {
  city: string;
  ready: boolean;
  hasPass: boolean;
  watched?: boolean;
  watching?: boolean;
  watch?: () => void;
}) {
  const navigation = useStoryNavigation();
  const { initial, remember } = useStorySession();
  const unavailable = navigation?.unavailable("aurora");
  return (
    <FixedJourneyEnding
      journey="above-earth"
      canRead={!hasPass || (watched && !watching)}
      ready={ready}
      playing={watching}
      playLabel={ready ? "Watch the pass" : "Calculating pass…"}
      playingLabel="Watching the pass…"
      {...(watch ? { replay: watch } : {})}
      title={hasPass ? "One horizon, two visits" : "From the city sky to orbit"}
      finishFocus=".related-stories summary"
      initialOpen={initial?.finding === true}
      onReveal={() => remember?.({ finding: true })}
    >
      <p>
        {hasPass
          ? `Apollo 17’s route records the 1972 surface mission. The ISS replay shows a predicted pass visible from ${city}.`
          : `From ${city}’s horizon you can see only part of the sky. A visible ISS pass also needs sunlight on the station.`}
      </p>
      <button
        type="button"
        id={auroraHandoff}
        aria-disabled={!!unavailable}
        onClick={() => {
          if (!unavailable) navigation?.start(auroraJourney, auroraHandoff);
        }}
      >
        Explore the aurora
      </button>
      {unavailable && <small>{unavailable}</small>}
    </FixedJourneyEnding>
  );
}
