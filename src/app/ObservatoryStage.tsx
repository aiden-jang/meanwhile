import { StoryProjection } from "./observations/StoryProjection";
import { LandingSolarRange } from "./LandingSolarRange";
import { geographicCoordinates } from "../globe/orbitReadout";
import { CUTAWAY_GUIDES_KM } from "../globe/cutawayScale";
import { subsolarPoint } from "../geo/sun";
import type { EarthScene } from "./useObservatory";
import type { Stop } from "./tour";
import type { AuroraRun } from "../sources/auroraRoute";
import type { ReactNode } from "react";
import "./scene-cues.css";

import { OBSERVATORY_SCENES } from "./SceneEntrances";

export function ObservatoryStage({
  scene,
  landing,
  at,
  tour,
  aurora,
  layers,
  projection,
}: {
  scene: EarthScene;
  landing: boolean;
  at: number;
  tour: Stop | null | undefined;
  aurora: AuroraRun | null;
  layers: ReactNode;
  projection: { map: boolean; setMap: (map: boolean) => void };
}): JSX.Element {
  const time = new Date(at).toISOString();
  const mode = tour !== undefined ? "tour" : aurora ? "aurora" : scene;
  const sceneName =
    mode === "tour"
      ? "Guided view"
      : mode === "aurora"
        ? "Aurora overflight"
        : OBSERVATORY_SCENES.find((item) => item.id === mode)!.name;
  const label =
    mode === "aurora"
      ? "NOAA forecast"
      : mode === "depth"
        ? "Depth guides"
        : mode === "night"
          ? "Catalogue sky"
          : mode === "tour"
            ? "Viewpoint"
            : "Sun overhead";
  const value = aurora
    ? `${aurora.route.focus.probability}% model chance`
    : mode === "depth"
      ? `${CUTAWAY_GUIDES_KM.slice(1).join(" / ")} km`
      : mode === "night"
        ? time.slice(0, 10)
        : mode === "tour"
          ? tour
            ? geographicCoordinates(tour)
            : "In transit"
          : geographicCoordinates(subsolarPoint(at));
  return (
    <div className="observatory-stage" data-stage={mode} role="group" aria-label="Globe readout">
      {mode === "live" ? (
        <span className="scene-cue scene-dayline-label" data-dayline-label="">
          <span className="scene-cue-label">Day–night boundary</span>
        </span>
      ) : (
        <div key={mode} className="stage-ident">
          <span className="stage-rule" aria-hidden="true" />
          <span>{sceneName}</span>
        </div>
      )}
      {aurora && (
        <span
          className="sky-reference-marker"
          data-observation-anchor=""
          data-lon={aurora.route.focus.lon}
          data-lat={aurora.route.focus.lat}
        >
          {geographicCoordinates(aurora.route.focus)}
        </span>
      )}
      {aurora && <StoryProjection map={projection.map} onMap={projection.setMap} label="Aurora projection" />}
      <div key={`readout-${mode}`} className="stage-readout">
        {layers}
        {landing && mode === "live" ? (
          <LandingSolarRange at={at} />
        ) : (
          <>
            <div>
              <span>{label}</span> <strong>{value}</strong>
            </div>
            <time dateTime={time}>
              {mode === "aurora" ? "Valid for " : ""}
              {time.slice(11, 16)} UTC
            </time>
          </>
        )}
      </div>
    </div>
  );
}

export function SunCredits(): JSX.Element {
  return (
    <div className="sun-credits" aria-label="Sun Watch sources">
      <a href="https://www.swpc.noaa.gov/products/solar-wind" target="_blank" rel="noreferrer">
        NOAA solar wind
      </a>
      <a href="https://www.swpc.noaa.gov/products/goes-x-ray-flux" target="_blank" rel="noreferrer">
        GOES X-rays
      </a>
      <a
        href="https://www.jpl.nasa.gov/images/pia26681-image-of-sun-from-nasas-solar-dynamics-observatory/"
        target="_blank"
        rel="noreferrer"
      >
        NASA/GSFC/SDO image
      </a>
    </div>
  );
}
