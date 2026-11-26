import { useLayoutEffect, useRef } from "react";
import { blackMarbleSource, lightsPeriods, mariaStudy } from "../../sources/observations/blackMarble";
import { cityPlace, drawLightsCrop, lightsCities, lightsPlaceName, type LightsPlace } from "./lightsSurface";

const recoveryPeriods = lightsPeriods.slice(1);

function Periods({
  index,
  choose,
  label,
}: {
  index: number;
  choose: (index: number) => void;
  label: string;
}) {
  return (
    <div className="recovery-choices" role="group" aria-label={label}>
      {recoveryPeriods.map(({ title, at }, i) => (
        <button key={at} type="button" aria-pressed={index === i + 1} onClick={() => choose(i + 1)}>
          {title}
        </button>
      ))}
    </div>
  );
}

export function LightsComparison({
  index,
  place,
  reading,
  ready,
  selectPeriod,
  selectPlace,
  inspect,
  replay,
}: {
  index: number;
  place: LightsPlace;
  reading: boolean;
  ready: boolean;
  selectPeriod: (index: number) => void;
  selectPlace: (place: LightsPlace) => void;
  inspect: (opener: HTMLButtonElement) => void;
  replay: () => void;
}) {
  const name = place.city ? "Inspect " + lightsPlaceName(place) : "Inspect this place";
  return (
    <section className="recovery-controls recovery-open" aria-label="Compare Puerto Rico" hidden={reading}>
      <h3>
        Light returned <br />
        unevenly.
      </h3>
      <p>Drag the lens to see the same place before Maria.</p>
      <div className="recovery-dates">
        <strong>Outside the lens</strong>
        <Periods index={index} choose={selectPeriod} label="Recovery period" />
        <span className="recovery-date">{lightsPeriods[index]!.dates}</span>
      </div>
      <div className="recovery-places">
        <strong>Explore a place</strong>
        <div className="recovery-choices" role="group" aria-label="Places in Puerto Rico">
          {lightsCities.map((city) => (
            <button
              key={city.id}
              type="button"
              aria-pressed={city.id === place.city}
              onClick={() => selectPlace(cityPlace(city))}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="recovery-read"
        disabled={!ready}
        onClick={(event) => inspect(event.currentTarget)}
      >
        {name}
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 12l8-8M5 4h7v7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <button type="button" className="recovery-replay" onClick={replay}>
        Island replay
      </button>
    </section>
  );
}

export function LightsPlaceReading({
  index,
  place,
  images,
  selectPeriod,
}: {
  index: number;
  place: LightsPlace;
  images: readonly HTMLImageElement[];
  selectPeriod: (index: number) => void;
}) {
  const baseline = useRef<HTMLCanvasElement>(null);
  const after = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (baseline.current) drawLightsCrop(baseline.current, images[0]!, place.point);
    if (after.current) drawLightsCrop(after.current, images[index]!, place.point);
  }, [images, index, place]);
  const name = lightsPlaceName(place);
  const { lon, lat } = place.point;
  const period = lightsPeriods[index]!;
  return (
    <section className="recovery-controls recovery-reading" aria-label="Night lights at this place">
      <h3>{name}</h3>
      <p>
        {lat.toFixed(3)}° N · {Math.abs(lon).toFixed(3)}° W
      </p>
      <div className="recovery-plates">
        <figure>
          <canvas
            ref={baseline}
            width="236"
            height="128"
            role="img"
            aria-label={name + " before Hurricane Maria"}
          />
          <figcaption>
            <strong>Before Maria</strong>
            <span>{lightsPeriods[0].dates}</span>
          </figcaption>
        </figure>
        <figure>
          <canvas ref={after} width="236" height="128" role="img" aria-label={name + " · " + period.title} />
          <figcaption>
            <strong>{period.title}</strong>
            <span>{period.dates}</span>
          </figcaption>
        </figure>
      </div>
      <p>Relative night-light brightness at the same location.</p>
      <Periods index={index} choose={selectPeriod} label="Reading period" />
      <a href={blackMarbleSource} target="_blank" rel="noreferrer">
        NASA Black Marble archive
      </a>
    </section>
  );
}

export function LightsSources() {
  return (
    <>
      <p>
        NASA Black Marble HD visualizations from Suomi NPP VIIRS. The three recovery periods are dated
        averages. The stills were aligned to the Natural Earth coast for comparison at island scale.
      </p>
      <a href={blackMarbleSource} target="_blank" rel="noreferrer">
        NASA Scientific Visualization Studio
      </a>
      <a href={mariaStudy} target="_blank" rel="noreferrer">
        Román and Stokes et al. · recovery study
      </a>
      <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
        Natural Earth coast
      </a>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        © OpenStreetMap contributors
      </a>
    </>
  );
}
