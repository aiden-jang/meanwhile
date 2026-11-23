import type { ObservatoryProps } from "./observatoryProps";
export type { ObservatoryProps } from "./observatoryProps";
import { observatoryIntroduction, observatoryReadingLabel } from "./observatoryIntroduction";
import { SunWatch, SunLoading, TonightSky, TonightCompass, FloatDive } from "./ObservatoryViews";
import { useOvalReturn } from "./sun/useSunVisit";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import { StoryIdentity } from "./journeys/StoryIdentity";
import { FixedJourneyLayout } from "./journeys/FixedJourney";
import { ConnectedJourney } from "./journeys/ConnectedJourney";
import { ExperienceEnding } from "./journeys/ExperienceEnding";
import { useObservatoryEscape } from "./useObservatoryEscape";
import { Suspense, useLayoutEffect, useState } from "react";
import { ObservatoryStage, ObservatoryScenePicker, SunCredits } from "./ObservatoryStage";
import { ObservatoryTourControls } from "./ObservatoryTourControls";
import { MoonfallReadout } from "./moonfall/MoonfallReadout";
import { FloatReadout } from "./float/FloatReadout";
import { RadarReadout, StormRadar } from "./radar/StormRadar";
import { AuroraOverflightControls } from "./AuroraOverflightControls";
import { geographicCoordinates } from "../globe/orbitReadout";
import "./experience.css";
import "./sun/sun-watch.css";
import "./tonight/tonight.css";
import "./float/float-dive.css";
import "./float/float-profile.css";
import "./float/float-journey.css";
import "./measurement-sound.css";
import "./moonfall/moonfall.css";
import { ObservationDeckShell } from "./observations/ObservationEntry";
import { ObservatoryEntryActions } from "./ObservatoryEntryActions";
import { StoryBoundary } from "./StoryBoundary";
import { StoryLoading } from "./StoryLoading";
import { StoryDockProvider } from "./observations/StoryDock";
import { nightfallPosition } from "./tonight/nightfall";
import { useAfterDarkSky } from "./tonight/useAfterDarkSky";
import { auroraJourney } from "./journeys/auroraJourney";
import { AuroraReading } from "./journeys/AuroraReading";
import { stormJourney } from "./journeys/stormJourney";
import "./journeys/aurora-journey.css";
export function Observatory(props: ObservatoryProps): JSX.Element {
  return (
    <StoryBoundary resetKey={props.views.navigation.key} onHome={props.onHome}>
      <ObservatoryContent {...props} />
    </StoryBoundary>
  );
}
function ObservatoryContent({
  layerReadout,
  explorer,
  scene,
  at,
  ready,
  summary,
  deepAvailable,
  aurora,
  views,
  radar,
  feedNote,
  onScene,
  onHome,
  onExplore,
  tour,
}: ObservatoryProps): JSX.Element {
  const { sun, tonight, floatDive, observations, skyCity, closeStory, browser, landing, navigation } = views;
  const fromAfterDark = useAfterDarkSky({ explorer, views, tour, aurora });
  const navigationContext = useStoryNavigation();
  const guidedStorm = navigationContext?.route?.id === stormJourney;
  const guidedAurora = navigationContext?.route?.id === auroraJourney;
  const heldOval = guidedAurora
    ? navigationContext.progressFor(auroraJourney)?.stops.find(([step]) => step === 0)?.[1].visit.position
        .moment
    : undefined;
  const [solarReadings, setSolarReadings] = useState<HTMLDivElement | null>(null);
  const closeView = (fallback: () => void) => () => {
    if (!navigationContext?.returnToBrowse()) fallback();
  };
  const active = tour.at !== null;
  const solar = sun.active && !active;
  useLayoutEffect(() => {
    tour.controls.current?.scrollTo(0, 0);
    tour.controls.current?.querySelector(".observatory-story")?.scrollTo(0, 0);
  }, [navigation.key, tour.at, tour.controls]);
  const ovalReturn = useOvalReturn(tour.controls, sun);
  const closeSun =
    aurora.run && !guidedAurora
      ? ovalReturn.close
      : closeView(() => observations.returnTo("open-sun-watch", sun.close));
  const closeAurora = closeView(() =>
    observations.returnTo("open-aurora-overflight", () => onScene("night")),
  );
  useObservatoryEscape(closeAurora, !solar && (!!aurora.run || aurora.requested));
  const auroraControls = (
    <AuroraOverflightControls
      aurora={aurora}
      ready={ready}
      solar={solar}
      guided={guidedAurora}
      onSunWatch={ovalReturn.open}
      onCloseSun={sun.close}
      onTonight={fromAfterDark.open}
      city={skyCity}
    />
  );
  const { title, description } = observatoryIntroduction({
    active,
    stop: tour.stop,
    scene,
    solar,
    aurora: !!aurora.run || aurora.requested,
    deepAvailable,
    landing,
  });
  if (observations.entry)
    return (
      <FixedJourneyLayout>
        <ObservationDeckShell
          deck={observations}
          entry={observations.entry}
          scene={scene}
          city={skyCity}
          readCamera={explorer.read}
          restoreCamera={explorer.restore}
          onClose={closeStory}
          onRadar={() => radar.open("pacific", true)}
        />
      </FixedJourneyLayout>
    );
  const story = (
    <section
      className="replay-region"
      aria-labelledby={tonight.active ? "local-sky-title" : undefined}
      aria-label={radar.active ? "Storm Radar" : undefined}
    >
      {floatDive.active ? (
        <FloatReadout view={floatDive.view} projection={observations} />
      ) : radar.active ? (
        <RadarReadout map={observations.map} onMap={observations.setMap} region={radar.view?.region} />
      ) : tonight.view?.moonfall ? (
        <MoonfallReadout
          view={tonight.view.moonfall}
          wake={() => {
            if (tonight.view) tonight.update({ ...tonight.view });
          }}
        />
      ) : tonight.active ? (
        <Suspense fallback={null}>
          <TonightCompass
            view={tonight.view}
            onView={tonight.update}
            projection={observations}
            orbit={tonight.orbit}
            onOrbit={tonight.setOrbit}
          />
        </Suspense>
      ) : (
        !solar && (
          <ObservatoryStage
            scene={scene}
            at={at}
            tour={active ? tour.stop : undefined}
            aurora={aurora.run}
            layers={layerReadout}
            projection={observations}
            onNightfall={
              landing && ready && navigationContext
                ? (anchor) =>
                    navigationContext.openNightfall(
                      nightfallPosition(at, anchor ?? explorer.read()),
                      "follow-nightfall",
                    )
                : undefined
            }
          />
        )
      )}
      <div
        className={`observatory-sidebar${tonight.active || radar.active || guidedAurora ? " replay-sidebar" : ""}`}
      >
        <StoryDockProvider>
          <section
            id="observatory-intro"
            tabIndex={-1}
            className="observatory-intro"
            ref={tour.controls}
            data-scene={active ? "tour" : scene}
            data-sun-watch={solar || undefined}
            data-storm-radar={radar.active || undefined}
            data-tonight={tonight.active || undefined}
            data-float-dive={floatDive.active || undefined}
            aria-label={observatoryReadingLabel(floatDive.active, tonight.active || radar.active)}
            aria-labelledby={tonight.active ? "local-sky-title" : undefined}
            role={tonight.active || radar.active ? "group" : undefined}
          >
            {floatDive.active ? (
              <Suspense fallback={<StoryLoading>Opening Float Dive…</StoryLoading>}>
                <FloatDive
                  view={floatDive.view}
                  resume={floatDive.entry}
                  returnLabel={navigationContext?.returnLabel}
                  onView={floatDive.update}
                  projection={observations}
                  onClose={closeView(() => observations.returnTo("open-featured-float", floatDive.close))}
                />
              </Suspense>
            ) : radar.active ? (
              <StormRadar
                key={JSON.stringify(radar.entry)}
                fromExplore={radar.fromExplore}
                returnLabel={radar.entry.story ? undefined : navigationContext?.returnLabel}
                entry={radar.entry}
                onView={radar.update}
                onClose={
                  radar.entry.story
                    ? radar.close
                    : closeView(() => {
                        const trigger = radar.fromExplore ? "open-explorer-radar" : "open-storm-radar";
                        observations.returnTo(trigger, radar.close);
                      })
                }
              />
            ) : tonight.active ? (
              <Suspense fallback={<StoryLoading>Opening Tonight’s Sky…</StoryLoading>}>
                <TonightSky
                  key={tonight.entry.revision}
                  view={tonight.view}
                  onView={tonight.update}
                  onJourney={tonight.handoff}
                  onLocalSky={() => {
                    tonight.setOrbit(false);
                    observations.setMap(false);
                  }}
                  readCamera={explorer.read}
                  preference={skyCity}
                  projection={observations}
                  initialMode={tonight.entry.mode}
                  returnSky={tonight.entry.returnSky}
                  initialPosition={tonight.entry.position}
                  nightfall={tonight.entry.nightfall}
                  orbit={tonight.orbit}
                  returnLabel={fromAfterDark.label ?? navigationContext?.returnLabel ?? "Back to After Dark"}
                  onClose={
                    fromAfterDark.close ??
                    closeView(() => {
                      const id =
                        tonight.entry.mode === "meteors"
                          ? "open-meteor-nights"
                          : tonight.entry.mode === "moonfall"
                            ? "open-featured-moonfall"
                            : "open-tonight-sky";
                      observations.returnTo(id, tonight.close);
                    })
                  }
                />
              </Suspense>
            ) : (
              <>
                {!guidedAurora && (solar || aurora.run || aurora.requested) && (
                  <button
                    type="button"
                    className="after-dark-return"
                    onClick={solar ? closeSun : closeAurora}
                  >
                    {solar && aurora.run && !guidedAurora
                      ? "Back to the oval"
                      : (navigationContext?.returnLabel ?? "Back to stars")}
                  </button>
                )}
                <div className="observatory-story" aria-live="polite" aria-atomic="true">
                  {!guidedAurora && <StoryIdentity id={navigationContext?.active} heading={title} />}
                  <h2 key={title}>
                    {landing ? (
                      <>
                        Look
                        <br /> closer.
                      </>
                    ) : (
                      title
                    )}
                  </h2>
                  <p key={description} className="observatory-description">
                    {guidedAurora
                      ? solar
                        ? "Read NOAA’s solar measurements beside the held forecast."
                        : "Follow NOAA’s forecast over Earth’s night side."
                      : description}
                  </p>
                  {active && tour.stop ? (
                    <p
                      className="observatory-location"
                      data-tour-location={`${tour.stop.lon},${tour.stop.lat}`}
                    >
                      {tour.stop.name}{" "}
                      <span>
                        {geographicCoordinates(tour.stop)} · Stop {Math.min((tour.at ?? 0) + 1, tour.length)}{" "}
                        of {tour.length}
                      </span>
                    </p>
                  ) : null}
                </div>
                {guidedAurora && solar && <div className="aurora-solar-panel" ref={setSolarReadings} />}
                {solar && <SunCredits />}
                {active ? (
                  <ObservatoryTourControls tour={tour} onExplore={onExplore} />
                ) : (
                  <>
                    {!solar && !aurora.run && !aurora.requested && (
                      <ObservatoryEntryActions
                        explore={() => {
                          browser.show("layers");
                          onExplore();
                        }}
                        browse={() => navigationContext?.browse(true)}
                      />
                    )}
                    {scene !== "night" && !landing ? (
                      <p
                        id={ready && !tour.available ? "tour-availability" : undefined}
                        className="observatory-summary"
                      >
                        {summary}
                      </p>
                    ) : null}
                  </>
                )}
                {!landing && !active && !solar && !aurora.run && !aurora.requested && (
                  <ObservatoryScenePicker
                    scene={scene}
                    ready={ready}
                    deepAvailable={deepAvailable}
                    onScene={(next) => {
                      observations.setQuery("");
                      if (scene === next) {
                        onHome();
                        return;
                      }
                      browser.select(next);
                      onScene(next);
                    }}
                  />
                )}
                {scene === "depth" && ready && !deepAvailable && (
                  <p id="depth-availability" className="observatory-depth-note">
                    No earthquake at least 70 km deep in this window. Recorded depth stories are still
                    available.
                  </p>
                )}
                {aurora.requested && !aurora.run && (
                  <p role="status">{aurora.unavailable ?? "Opening Aurora Overflight…"}</p>
                )}
                {aurora.newerForecast && !solar && (
                  <p className="observation-note" role="status">
                    The linked forecast is no longer available. Showing NOAA’s current forecast.
                  </p>
                )}
                {guidedAurora && !solar && aurora.run && <AuroraReading run={aurora.run} />}
                {((solar && !guidedAurora) || (!solar && aurora.run)) && auroraControls}
                {feedNote && !landing ? (
                  <p className="observatory-source-note" role="status">
                    {feedNote}
                  </p>
                ) : null}
              </>
            )}
            {tonight.active && <ConnectedJourney />}
            {(floatDive.active || (radar.active && !guidedStorm) || solar || aurora.run) && (
              <ExperienceEnding />
            )}
          </section>
        </StoryDockProvider>
      </div>
      {solar && (
        <Suspense fallback={<SunLoading />}>
          <SunWatch
            onClose={closeSun}
            sample={sun.sample}
            xraySample={sun.xray}
            position={sun.position}
            remember={sun.remember}
            journey={
              guidedAurora
                ? {
                    readings: solarReadings,
                    forecastAt: aurora.run?.forecast.forecastAt ?? heldOval?.at,
                    southern: aurora.run ? aurora.run.route.hemisphere === -1 : heldOval?.choice === "south",
                  }
                : undefined
            }
          />
        </Suspense>
      )}
    </section>
  );
  return tonight.active || guidedAurora || guidedStorm ? (
    <FixedJourneyLayout>{story}</FixedJourneyLayout>
  ) : (
    story
  );
}
