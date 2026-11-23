import { SkyInvitation } from "./SkyInvitation";
import type { CameraState } from "../../globe/controlsTypes";
import { ShareMoment } from "../observations/StorySession";
import { skyPosition, skyStoryMoment, type SkyPosition } from "./skyMoment";
import { ExperienceEnding } from "../journeys/ExperienceEnding";
import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  aimAt,
  localNight,
  moonsetBetween,
  openingSky,
  skyBodies,
  type TonightView,
} from "../../geo/tonight";
import type { TonightPresentation } from "../../globe/scenePresentation";
import { nightTrail } from "../../geo/nightTrail";
import { skyLight } from "./nightfall";
import { useObservatoryEscape } from "../useObservatoryEscape";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { SkyTimeline } from "./SkyTimeline";
import { traceSkyBody } from "./traceSkyBody";
import { StoryDock } from "../observations/StoryDock";
import { SkyCityPicker, type SkyCityPreference } from "./SkyCityPicker";
import { MeteorNights } from "./MeteorNights";
import { SkyObjects } from "./SkyObjects";
import { skyTargets } from "./skyTargets";
import { skyCities } from "./cities";
import { lunarFlight, TonightMoonfall } from "./TonightMoonfall";
import { SkyEarthEntry, SkyEarthReading, SkyHeading, skyTimeFormats } from "./SkyEarthReading";
const MINUTE = 60_000;
export function TonightSky({
  view,
  onView,
  onJourney,
  onLocalSky,
  onClose,
  preference,
  initialMode,
  returnSky,
  initialPosition,
  nightfall = false,
  orbit,
  onCityWeather,
  returnLabel,
  projection,
  readCamera,
  tabs,
}: {
  view: TonightPresentation | null;
  tabs?: ReactNode;
  onView: (next: TonightPresentation) => void;
  onJourney: (next: TonightPresentation) => void;
  onLocalSky: () => void;
  onClose: () => void;
  preference: SkyCityPreference;
  initialMode: "sky" | "meteors" | "moonfall";
  returnSky?: TonightView | null | undefined;
  initialPosition: SkyPosition | undefined;
  nightfall?: boolean | undefined;
  orbit: boolean;
  onCityWeather: (city: SkyCityPreference["city"], at: number) => void;
  returnLabel: string;
  readCamera: () => CameraState;
  projection: { map: boolean; setMap: (map: boolean) => void };
}): JSX.Element {
  const back = useRef<HTMLButtonElement>(null);
  const rangeId = useId();
  const [openedAt] = useState(() => Date.now());
  const [mode, setMode] = useState(initialMode === "moonfall" ? "sky" : initialMode);
  const [meteorDeparture, setMeteorDeparture] = useState<TonightView | null>(returnSky ?? null);
  const [started, setObserving] = useState(
    Boolean(initialPosition) && (!nightfall || !!initialPosition?.direct),
  );
  const [arrivalCity, setArrivalCity] = useState(() =>
    nightfall ? skyCities.find(({ name }) => name === initialPosition?.city) : undefined,
  );
  const city = arrivalCity ?? preference.city;
  const initial = useMemo(() => {
    if (mode === "sky" && returnSky?.city.name === city.name) return skyPosition(returnSky, false, false);
    return initialPosition?.city === city.name ? initialPosition : undefined;
  }, [mode, returnSky, city.name, initialPosition]);
  const navigation = useStoryNavigation();
  const guided = navigation?.route?.id === "above-earth";
  const entries = navigation?.library.saved;
  const night = useMemo(() => {
    const at = initial?.at ?? openedAt;
    const candidate = localNight(city, initial?.nightStart ?? at);
    return at < candidate.start && initial ? localNight(city, at - 12 * 3_600_000) : candidate;
  }, [city, openedAt, initial]);
  const format = useMemo(() => skyTimeFormats(city.zone), [city.zone]);
  const opening = useMemo(() => {
    const base = { ...openingSky(city, night.start, night.end), nightStart: night.start };
    if (!initial || initial.at < night.start || initial.at > night.end) return base;
    const bodies = skyBodies(city, initial.at);
    return {
      ...base,
      at: initial.at,
      bodies,
      look: initial.look,
      ...(initial.target
        ? {
            targetName: initial.target,
            ...(initial.trail
              ? {
                  nightTrail: {
                    points: nightTrail(city, initial.target, night.start, night.end),
                    following: !!initial.following,
                  },
                }
              : {}),
          }
        : {}),
      ...(initial.reference ? { reference: initial.reference } : {}),
    };
  }, [city, night.start, night.end, initial]);
  const current = view?.city.name === city.name ? view : opening;
  const observing = started || current.look !== opening.look;
  const [departure, setDeparture] = useState(() =>
    view?.lunarDeparture
      ? { ...view.lunarDeparture, aim: view }
      : initialMode === "moonfall" || initial?.lunar
        ? lunarFlight(current, projection.map ? readCamera() : undefined)
        : null,
  );
  const at = current.at;
  const moonset = useMemo(() => moonsetBetween(city, night.start, night.end), [city, night.start, night.end]);
  const kept = entries?.flatMap(({ id, position }) =>
    id === "sky" && position.sky?.city === city.name
      ? [Math.floor((position.sky.at - night.start) / MINUTE)]
      : [],
  );
  const { target } = skyTargets(current.bodies);
  function findBody(body: TonightView["bodies"][number]) {
    setObserving(true);
    onLocalSky();
    onView(traceSkyBody(current, body, night));
  }
  function seek(at: number) {
    const bodies = skyBodies(city, at);
    const followed = current.nightTrail?.following && bodies.find((body) => body.name === current.targetName);
    onView({
      ...current,
      at,
      bodies,
      look: followed && followed.altitude > 0 ? aimAt(followed) : current.look,
    });
    setObserving(true);
  }
  const sky = skyLight(city, at, night);
  useLayoutEffect(() => back.current?.focus({ preventScroll: true }), []);
  useLayoutEffect(() => {
    if (!departure && mode === "sky" && view?.city.name !== city.name) {
      onView(opening);
    }
  }, [view?.city.name, city.name, mode, opening, onView, departure]);
  const returnToSky = () => {
    if (!departure) return;
    if (initialMode === "moonfall") {
      onClose();
      return;
    }
    const { previous, camera, scroll } = departure;
    onJourney(camera ? { ...previous, reference: camera } : previous);
    projection.setMap(!!camera);
    setDeparture(null);
    requestAnimationFrame(() => {
      document.getElementById("observatory-intro")?.scrollTo(0, scroll);
      document.getElementById("open-moonfall")?.focus({ preventScroll: true });
    });
  };
  useLayoutEffect(() => {
    if (!departure) return;
    document.getElementById("moonfall-back")?.focus({ preventScroll: true });
    if (guided) onView(departure.aim);
  }, [departure, guided, onView]);
  const cityReference = mode === "sky" && !guided && !!initialPosition?.direct;
  const fromEarth = cityReference && (projection.map || orbit);
  const returnFromEarth = () => {
    onJourney(current);
    onLocalSky();
    requestAnimationFrame(() =>
      document.getElementById("see-observing-city")?.focus({ preventScroll: true }),
    );
  };
  useObservatoryEscape(departure ? returnToSky : fromEarth ? returnFromEarth : onClose);
  function approachMoon() {
    const flight = lunarFlight(current, projection.map ? readCamera() : undefined);
    setDeparture(flight);
    onJourney(flight.aim);
  }

  if (departure)
    return (
      <TonightMoonfall
        aim={departure.aim}
        resume={initial?.lunar}
        view={view}
        onView={onView}
        label={initialMode === "moonfall" ? returnLabel : "Back to Tonight’s Sky"}
        onReturn={returnToSky}
        earthView={
          guided
            ? `${departure.previous.city.name} · ${format.local.format(departure.previous.at)}`
            : undefined
        }
      />
    );
  if (fromEarth)
    return (
      <SkyEarthReading
        city={city}
        at={at}
        time={format.local.format(at)}
        onBack={returnFromEarth}
        onWeather={() => onCityWeather(city, at)}
      />
    );
  const title = mode === "sky" ? "Tonight’s Sky" : "Meteor Nights";
  const timeline = (
    <SkyTimeline
      id={rangeId}
      at={at}
      night={night}
      format={format}
      kept={kept}
      onSeek={seek}
      compact={!!tabs}
    />
  );
  const objects = (
    <SkyObjects
      current={current}
      sky={sky}
      onFind={findBody}
      moonset={
        moonset === null
          ? undefined
          : `${at < moonset ? "Sets at" : "Set at"} ${format.clock.format(moonset)}`
      }
    />
  );
  const cityControls = (
    <>
      <SkyCityPicker
        city={city.name}
        select={(name) => {
          setArrivalCity(undefined);
          preference.select(name);
        }}
      />
      {cityReference && (
        <SkyEarthEntry
          city={city}
          open={() => {
            onJourney(current);
            projection.setMap(true);
          }}
        />
      )}
    </>
  );
  const moonfallEntry = mode === "sky" && !guided && (
    <div className="tonight-moonfall-entry">
      <button type="button" id="open-moonfall" onClick={approachMoon}>
        <strong>{current.bodies[0]!.altitude > 0 ? "Approach the Moon" : "Visit Apollo 17"}</strong>
        <span>Moonfall · Taurus–Littrow</span>
      </button>
    </div>
  );
  const share = (
    <ShareMoment
      current={() =>
        skyStoryMoment("sky", {
          ...skyPosition(current, projection.map, orbit),
          ...(projection.map || orbit ? { reference: readCamera() } : {}),
        })
      }
    />
  );
  if (tabs && mode === "sky")
    return (
      <>
        <SkyHeading title={title} label={returnLabel} back={back} onBack={onClose} compact />
        {timeline}
        <div className="entry-sky-city">{cityControls}</div>
        {tabs}
        <details className="scene-entry-details">
          <summary>Sky details</summary>
          {objects}
          {moonfallEntry}
          <button
            type="button"
            onClick={() => {
              setMeteorDeparture(current);
              setMode("meteors");
            }}
          >
            Meteor Nights
          </button>
          {share}
        </details>
      </>
    );
  return (
    <>
      <SkyHeading title={title} label={returnLabel} back={back} onBack={onClose} />
      {mode === "sky" && !observing && !guided && (
        <SkyInvitation
          arrivalCity={!!arrivalCity}
          city={city.name}
          at={at}
          time={format.local.format(at)}
          target={target}
          onFind={() => {
            if (target) findBody(target);
          }}
          onChange={() => setObserving(true)}
        />
      )}
      {cityControls}
      {moonfallEntry}
      {mode === "meteors" ? (
        <MeteorNights
          city={city}
          view={view}
          initialPosition={initialMode === "meteors" ? initial : undefined}
          initialLook={meteorDeparture?.city.name === city.name ? meteorDeparture.look : initial?.look}
          onView={onView}
        />
      ) : (
        <>
          <StoryDock label="Tonight’s Sky time" deferOnShortPhone={!observing && !guided}>
            {timeline}
          </StoryDock>
          {objects}
        </>
      )}
      <div className="tonight-onward">
        <p>{mode === "sky" ? "Explore another sky experience" : "Return to your observing moment"}</p>
        <div className="observatory-actions tonight-mode" role="group" aria-label="Local sky view">
          <button
            type="button"
            aria-pressed={mode === "sky"}
            onClick={() => {
              if (mode === "sky") return;
              onView(meteorDeparture?.city.name === city.name ? meteorDeparture : opening);
              setMode("sky");
              setObserving(true);
            }}
          >
            Sky view
          </button>
          <button
            type="button"
            aria-pressed={mode === "meteors"}
            onClick={() => {
              if (mode === "meteors") return;
              setMeteorDeparture(current);
              setMode("meteors");
            }}
          >
            Meteor Nights
          </button>
        </div>
      </div>
      {mode === "sky" && observing && share}
      <ExperienceEnding id={mode} />
    </>
  );
}
