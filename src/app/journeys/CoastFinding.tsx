import { FixedJourneyEnding } from "./FixedJourney";
import { useStoryNavigation } from "./StoryNavigation";
import { revealReading } from "../observations/revealReading";
import { layerTime } from "../layerTime";
import type { ObservationFrame } from "../observations/types";
import { dartReading, tsunamiBuoys } from "../../sources/observations/tsunamiRecord";

export function CoastFinding({ harbor, frame }: { harbor: string; frame: ObservationFrame | undefined }) {
  const navigation = useStoryNavigation();
  if (!navigation || navigation.route?.id !== "reading-the-coast") return null;
  const stops = navigation.progressFor("reading-the-coast")?.stops ?? [];
  const atStop = (index: number) => stops.find(([step]) => step === index)?.[1].visit;
  const kept = navigation.library.saved.find(
    ({ id, position }) => id === "kilauea" && position.moment?.chapter === "compare",
  );
  const shore = kept ?? atStop(0);
  const comparison = shore?.position.moment;
  const wave = atStop(1)?.position.moment;
  const buoy = tsunamiBuoys.find(({ id }) => id === wave?.choice);
  const reading = buoy && wave?.at !== undefined ? dartReading(buoy, wave.at) : undefined;
  const tide = frame?.tide;
  const difference = tide?.predicted === undefined ? undefined : tide.observed - tide.predicted;
  return (
    <FixedJourneyEnding
      journey="reading-the-coast"
      canRead
      ready
      title="Three ways a coast changes"
      finishFocus=".related-stories summary"
    >
      <p>
        Lava built new land. A tsunami briefly changed the water level offshore. The tide moves the waterline
        every day.
      </p>
      <ul className="coast-finding">
        <li>
          <button type="button" onClick={() => navigation.step(0, kept)}>
            <strong>Kīlauea shoreline</strong>
            <span>
              {comparison?.chapter === "compare"
                ? `${kept ? "Kept comparison" : "Shoreline divider"} · ${comparison.choice}%`
                : comparison?.at
                  ? layerTime(comparison.at)
                  : "Open the shoreline survey"}
            </span>
          </button>
        </li>
        <li>
          <button type="button" onClick={() => navigation.step(1)}>
            <strong>{buoy?.label ?? "Tsunami Arrival"}</strong>
            <span>
              {reading ? `${reading[1].toFixed(3)} m · ${layerTime(reading[0])}` : "Open the buoy record"}
            </span>
          </button>
        </li>
        {frame && (
          <li>
            <button
              type="button"
              onClick={() => {
                const chart = document.querySelector<HTMLElement>("#observatory-intro .observation-chart");
                chart?.querySelector("summary")?.focus({ preventScroll: true });
                revealReading(chart, "start");
              }}
            >
              <strong>{harbor}</strong>
              <span>
                {difference === undefined
                  ? "No prediction at this time"
                  : difference === 0
                    ? "Observed level matches prediction"
                    : `${Math.abs(difference).toFixed(3)} m ${difference > 0 ? "above" : "below"} prediction`}
                {" · "}
                {layerTime(frame.at)}
              </span>
            </button>
          </li>
        )}
      </ul>
    </FixedJourneyEnding>
  );
}
