import { StoryDeparture } from "./StoryDeparture";
import { SharedStory } from "./SharedStory";
import { StoryLoading } from "../StoryLoading";
import { ExperienceEnding } from "../journeys/ExperienceEnding";
import { FixedJourneyEnding } from "../journeys/FixedJourney";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { CoastWorldReading } from "../journeys/CoastWorldReading";
import { WaterSourceRecord } from "../journeys/WaterSourceRecord";
import { ConnectedJourney } from "../journeys/ConnectedJourney";
import { RiverWorldReading } from "./RiverReading";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useObservatoryEscape } from "../useObservatoryEscape";
import { observations, type ObservationId } from "./catalogue";
import { loadSource } from "./load";
import { TideGauge } from "./TideGauge";
import { ObservationPlayer } from "./ObservationPlayer";
import type { ObservationSource } from "./types";
import type { useObservationDeck } from "./useObservationDeck";
import { swellBuoys } from "./swellBuoys";
import { StoryDockProvider } from "./StoryDock";
import { StoryProjection } from "./StoryProjection";

import { ShareMoment, useStorySession } from "./StorySession";

type Deck = Omit<ReturnType<typeof useObservationDeck>, "entry"> & {
  entry: Exclude<ObservationId, "iceberg" | "orbit">;
};

export function ObservationDeck({
  deck,
  onClose,
  closeLabel,
}: {
  deck: Deck;
  onClose: () => void;
  closeLabel: string;
}): JSX.Element {
  const { initial } = useStorySession();
  const back = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState<{ id: ObservationId; source: ObservationSource | null } | null>(null);
  const [revision, retry] = useState(0);
  const [landed, setLanded] = useState(false);
  const arrive = useCallback(() => setLanded(true), []);
  const [buoy, setBuoy] = useState<string>(
    swellBuoys.find((b) => b.id === initial?.choice)?.id ?? swellBuoys[0].id,
  );
  const id = deck.entry;
  const journey = useStoryNavigation()?.route?.id;
  const water = journey === "water-in-motion";
  const coast = journey === "reading-the-coast" && (id === "tsunami" || id === "tide");
  const wave = coast && id === "tsunami";
  const showingForecast =
    water && id === "rain" && deck.shownSource === "atmospheric-river" && !!deck.view?.frame.paths?.length;
  const meta = observations[id];
  const title = meta.title;
  const photograph = deck.view?.frame.photograph;
  const picker = id === "swell" ? { value: buoy, select: setBuoy } : undefined;

  useLayoutEffect(() => back.current?.focus({ preventScroll: true }), [id]);
  useObservatoryEscape(onClose);
  const { update } = deck;
  const openFailed = loaded?.id === id && !loaded.source;
  useLayoutEffect(() => {
    if (showingForecast && openFailed) update(null, true);
  }, [showingForecast, openFailed, update]);

  useEffect(() => {
    let active = true;
    void loadSource[id]().then(
      (source) => {
        if (active) setLoaded({ id, source });
      },
      () => {
        if (active) setLoaded({ id, source: null });
      },
    );
    return () => {
      active = false;
    };
  }, [id, revision]);

  return (
    <section
      className={
        coast || id === "rain" || id === "river" || id === "drifter" || id === "smoke"
          ? "replay-region field-journey"
          : "replay-region"
      }
      aria-label={title}
      data-coast-observation={coast ? id : undefined}
    >
      <div
        className="observatory-stage replay-stage"
        data-stage="observation"
        role="group"
        aria-label={id === "epic" ? "DSCOVR camera view" : `${title} on the ${deck.map ? "map" : "globe"}`}
      >
        {photograph && id === "epic" && (
          <div className="observation-photograph" data-loaded={deck.view?.image ? "true" : "false"}>
            {deck.view?.image && <img src={deck.view.image.src} alt={photograph.alt} />}
          </div>
        )}
        <StoryDeparture />
        {wave && <CoastWorldReading frame={deck.view?.frame} />}
        <div className="stage-corners" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="stage-ident">
          <span className="stage-rule" aria-hidden="true" />
          <span>
            {showingForecast
              ? "NOAA GFS forecast · opening Rainbelt"
              : wave
                ? "2010 Chile tsunami"
                : meta.source}
          </span>
        </div>
        {!deck.map && deck.view?.frame.tide && <TideGauge tide={deck.view.frame.tide} />}
        {id === "river" && (!water || landed) && <RiverWorldReading frame={deck.view?.frame} />}
        <div className="stage-readout">
          {showingForecast
            ? "Forecast still on the map · water-vapor transport"
            : wave
              ? "NOAA ETOPO model · First arrivals"
              : coast
                ? "Measured harbor levels"
                : id === "rain"
                  ? "Satellite estimate · Precipitation rate"
                  : id === "river"
                    ? "Gauge readings · Discharge"
                    : `${id === "epic" ? "DSCOVR camera" : deck.map ? "Map" : "Globe"} · ${meta.group}`}
        </div>
        {id !== "epic" && (
          <StoryProjection map={deck.map} onMap={deck.setMap}>
            {id === "swell" && (
              <div className="swell-buoys" role="group" aria-label="Pacific buoys">
                {swellBuoys.map(({ id, short, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={buoy === id}
                    aria-label={`Show ${label} buoy`}
                    onClick={() => setBuoy(id)}
                  >
                    {short}
                  </button>
                ))}
              </div>
            )}
          </StoryProjection>
        )}
      </div>
      <div className="observatory-sidebar replay-sidebar">
        <StoryDockProvider>
          <div
            id="observatory-intro"
            className="observatory-intro observation-panel"
            tabIndex={-1}
            data-observation={deck.entry}
          >
            <div className="observation-heading">
              <h2>{title}</h2>
              <div className="observatory-actions">
                <button
                  className="reading-back"
                  type="button"
                  ref={back}
                  onClick={onClose}
                  aria-label={closeLabel}
                >
                  <span className="observation-back-full">{closeLabel}</span>
                  <span className="observation-back-compact">Back</span>
                </button>
              </div>
            </div>
            <p className="observation-note observation-introduction">{meta.description}</p>
            {id === "rain" && loaded?.id !== id && (
              <WaterSourceRecord id="rain" forecastVisible={showingForecast} />
            )}
            {id !== "river" && !water && <SharedStory />}
            <ConnectedJourney />
            {loaded?.id === id ? (
              loaded.source ? (
                <ObservationPlayer
                  key={id}
                  id={id}
                  source={loaded.source}
                  map={deck.map}
                  update={deck.update}
                  showingForecast={showingForecast}
                  onArrival={id === "river" && water ? arrive : undefined}
                  {...(picker ? { picker } : {})}
                />
              ) : (
                <div className="observation-note" role="status">
                  <p>This view couldn’t open.</p>
                  <div className="observatory-actions">
                    <button type="button" onClick={() => retry((value) => value + 1)}>
                      Try again
                    </button>
                  </div>
                </div>
              )
            ) : (
              <StoryLoading>Opening {title}…</StoryLoading>
            )}
            {id === "river" && water && (
              <FixedJourneyEnding
                journey="water-in-motion"
                canRead
                ready
                title="Three ways to see water move"
                finishFocus=".related-stories summary"
              >
                <p>
                  Forecasts model moisture in the air. Satellites estimate rain. River gauges measure how much
                  water flows past a specific point.
                </p>
              </FixedJourneyEnding>
            )}
            {id === "river" && !water && <SharedStory />}
            <ShareMoment />
            <ExperienceEnding showFinding={!coast} showLocation={id !== "river"} />
          </div>
        </StoryDockProvider>
      </div>
    </section>
  );
}
