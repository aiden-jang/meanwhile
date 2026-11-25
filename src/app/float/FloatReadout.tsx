import { geographicCoordinates } from "../../globe/orbitReadout";
import { useSyncExternalStore } from "react";
import type { FloatDiveView } from "./floatPlayback";
import { FloatDepthHandle } from "./FloatDepthHandle";
import { FloatWorldProfile } from "./FloatWorldProfile";
import { StoryProjection } from "../observations/StoryProjection";

type Projection = { map: boolean; setMap: (map: boolean) => void };
function Reading({
  view,
  projection,
  fromExplore,
}: {
  view: FloatDiveView;
  projection: Projection;
  fromExplore: boolean;
}) {
  const { index, stage, inspecting, field, playing } = useSyncExternalStore(view.subscribe, view.read);
  const sample = view.profile.samples[index]!;
  return (
    <>
      {(fromExplore || stage === "locate") && (
        <StoryProjection map={projection.map} onMap={projection.setMap} label="Float projection" />
      )}
      {stage === "locate" && (
        <span
          className="float-place"
          data-observation-anchor
          data-lon={view.profile.lon}
          data-lat={view.profile.lat}
        >
          Float {view.profile.wmo}
          <small>{geographicCoordinates(view.profile)}</small>
        </span>
      )}
      <div className="float-reading-layer" data-field={inspecting ? field : undefined}>
        {fromExplore ? (
          <FloatWorldProfile samples={view.profile.samples} index={index} />
        ) : (
          <>
            <svg className="float-tether" aria-hidden="true">
              <path fill="none" />
            </svg>
            <div className="float-depth-track" data-float-depth-track="" aria-hidden="true" />
          </>
        )}
        <div className="float-instrument-reading" data-float-instrument>
          {(fromExplore || stage === "rise" || inspecting) && <FloatDepthHandle view={view} index={index} />}
          <span aria-hidden="true">{Math.round(sample.depth).toLocaleString()} m</span>
          {!fromExplore && stage === "rise" && !inspecting && index === 0 && !playing && (
            <small className="float-depth-cue" aria-hidden="true">
              Drag to change depth
            </small>
          )}
          {inspecting && (
            <small aria-hidden="true">
              {field === "temperature"
                ? `${sample.temperature.toFixed(2)} °C`
                : `${sample.salinity.toFixed(3)} salinity`}
            </small>
          )}
        </div>
      </div>
    </>
  );
}

export function FloatReadout({
  view,
  projection,
  fromExplore,
}: {
  view: FloatDiveView | null;
  projection: Projection;
  fromExplore: boolean;
}): JSX.Element {
  const profile = view?.profile;
  return (
    <div
      className="observatory-stage"
      data-stage="float"
      data-float-world-reading={fromExplore || undefined}
      role="group"
      aria-label="Argo float view"
    >
      <div className="stage-ident">
        <span className="stage-rule" aria-hidden="true" />
        <span>{profile ? `Argo · WMO ${profile.wmo}` : "Argo · North Atlantic"}</span>
      </div>
      {view && <Reading view={view} projection={projection} fromExplore={fromExplore} />}
      <div id="float-profile-stage" />
      {profile && (
        <div className="stage-readout">{geographicCoordinates(profile)} · Illustrated ocean section</div>
      )}
    </div>
  );
}
