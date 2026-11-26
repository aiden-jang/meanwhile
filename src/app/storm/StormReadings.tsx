import { useLayoutEffect, useRef, type Ref } from "react";
import { FIXES, LANDFALL, PEAK, stormCategory, stormClock } from "./stormTrack";

type Fix = (typeof FIXES)[number];

export function StormReading({
  refHeading,
  fix,
  atFix,
  live,
}: {
  refHeading: Ref<HTMLHeadingElement>;
  fix: Fix;
  atFix: boolean;
  live: boolean;
}) {
  const title = fix.landfall
    ? "Landfall near Buras, Louisiana"
    : fix === PEAK
      ? "Offshore peak"
      : live
        ? "Gulf of Mexico"
        : "Across the Gulf";
  return (
    <div className="archive-scene-caption storm-reading" data-reading-cue="">
      <h3 ref={refHeading} tabIndex={-1}>
        {title}
      </h3>
      <div
        className="storm-measurements"
        aria-live={live ? "polite" : undefined}
        aria-atomic={live || undefined}
      >
        <div>
          <span>Max sustained wind</span>
          <strong>{fix.wind} kt</strong>
        </div>
        <div>
          <span>Central pressure</span>
          <strong>{fix.pressure} hPa</strong>
        </div>
      </div>
      <p>
        Category {stormCategory(fix.wind)}
        {!live && (
          <>
            {" "}
            · {atFix ? "Recorded position" : "Last recorded position"}{" "}
            <time dateTime={fix.at}>{stormClock(fix.time)}</time>
          </>
        )}
      </p>
    </div>
  );
}

export function StormWindExtent({
  fix,
  atFix,
  onWorld = false,
}: {
  fix: Fix;
  atFix: boolean;
  onWorld?: boolean;
}) {
  return (
    <p className={onWorld ? "storm-legend storm-world-legend" : "storm-legend"}>
      {fix.r34 ? (
        <>
          <span>
            <i className="storm-extent" aria-hidden="true" />
            34 kt radius
          </span>
          {fix.r64 && (
            <span>
              <i className="storm-extent storm-extent-strong" aria-hidden="true" />
              64 kt radius
            </span>
          )}
          {!atFix && <span>Center and radii interpolated.</span>}
        </>
      ) : (
        "Wind extent unavailable for this position."
      )}
    </p>
  );
}

export function StormLandfallComparison() {
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    heading.current?.closest("#observatory-intro")?.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="storm-landfall-reading" aria-label="Peak and landfall comparison">
      <h3 ref={heading} tabIndex={-1}>
        Peak to landfall
      </h3>
      <table>
        <thead>
          <tr>
            <td />
            <th scope="col">
              Offshore peak<small>{stormClock(PEAK.time).replace(" · ", " ")}</small>
            </th>
            <th scope="col">
              Buras landfall<small>{stormClock(LANDFALL.time).replace(" · ", " ")}</small>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Max wind</th>
            <td>{PEAK.wind} kt</td>
            <td>{LANDFALL.wind} kt</td>
          </tr>
          <tr>
            <th scope="row">Pressure</th>
            <td>{PEAK.pressure} hPa</td>
            <td>{LANDFALL.pressure} hPa</td>
          </tr>
        </tbody>
      </table>
      <p className="storm-landfall-delta">
        <strong>{PEAK.wind - LANDFALL.wind} kt lower wind</strong>
        <span>{LANDFALL.pressure - PEAK.pressure} hPa higher pressure</span>
      </p>
      <p>Wind radii on the globe and map show the offshore peak.</p>
      <a href="https://www.nhc.noaa.gov/data/tcr/AL122005_Katrina.pdf" target="_blank" rel="noreferrer">
        NOAA storm report
      </a>
    </section>
  );
}
