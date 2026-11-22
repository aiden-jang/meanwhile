import { useStoryNavigation } from "./StoryNavigation";

const descriptions = {
  "atmospheric-river": ["NOAA GFS", "Forecast water-vapor transport", "kg m⁻¹ s⁻¹"],
  rain: ["NASA GPM IMERG", "Satellite precipitation estimate", "mm/h"],
  river: ["USGS Water Data", "Measured river discharge", "ft³/s"],
} as const;
const utc = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  dateStyle: "medium",
  timeStyle: "short",
});

function SourceTime({ at }: { at: number }) {
  return <time dateTime={new Date(at).toISOString()}>{utc.format(at)} UTC</time>;
}

export function WaterSourceRecord({
  id,
  at,
  forecastVisible = false,
  requestedAt,
  run,
}: {
  id: keyof typeof descriptions;
  at?: number | undefined;
  forecastVisible?: boolean;
  requestedAt?: number | undefined;
  run?: string | undefined;
}) {
  const navigation = useStoryNavigation();
  if (navigation?.route?.id !== "water-in-motion") return null;
  const forecast =
    id === "rain"
      ? navigation.progressFor("water-in-motion")?.stops.find(([step]) => step === 0)?.[1].visit.position
          .moment
      : undefined;
  const [source, measure, units] = descriptions[id];
  return (
    <section className="water-source-record" aria-label="Source and time" data-source={id}>
      <small>{source}</small>
      <strong>
        {measure} · {units}
      </strong>
      {at !== undefined ? (
        <div>
          {id === "atmospheric-river" && "Valid "}
          <SourceTime at={at} />
        </div>
      ) : (
        <small>{id === "rain" ? "No satellite frame shown yet" : "No gauge reading shown yet"}</small>
      )}
      {run && <small>Model run {run}</small>}
      {id === "rain" && requestedAt !== undefined && requestedAt !== at && (
        <small>
          Selected estimate <SourceTime at={requestedAt} />
        </small>
      )}
      {forecast?.at !== undefined && (
        <div className="water-source-previous">
          <small>
            {forecastVisible ? "On screen while Rainbelt loads" : "Previous view"} · NOAA forecast (kg m⁻¹
            s⁻¹)
          </small>
          <div>
            Valid <SourceTime at={forecast.at} />
          </div>
          <p>Each source has its own timestamp.</p>
        </div>
      )}
    </section>
  );
}
