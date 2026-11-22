import { FixedJourneyEnding } from "./FixedJourney";

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
    >
      <p>
        {hasPass
          ? `Apollo 17’s route records the 1972 surface mission. The ISS replay shows a predicted pass visible from ${city}.`
          : `From ${city}’s horizon you can see only part of the sky. A visible ISS pass also needs sunlight on the station.`}
      </p>
    </FixedJourneyEnding>
  );
}
