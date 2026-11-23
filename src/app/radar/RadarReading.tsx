import type { ReactNode } from "react";
import { currentRadarRegion, globalRadarRegions, radarRegions } from "./radarCamera";

export function RadarReading({
  layer,
  place,
  regionId,
  setRegionId,
  global,
  initialPose,
  problem,
  statusMessage,
  canRetry,
  provider,
  retry,
}: {
  layer: boolean;
  place: string;
  regionId: string;
  setRegionId: (id: string) => void;
  global: boolean;
  initialPose: boolean;
  problem: boolean;
  statusMessage: ReactNode;
  canRetry: boolean;
  provider: string;
  retry: () => void;
}) {
  return (
    <div className="radar-reading">
      {!layer && (
        <div className="radar-place">
          <h3>{place}</h3>
          <label>
            <span className="sr-only">Radar region</span>
            <select value={regionId} onChange={(event) => setRegionId(event.currentTarget.value)}>
              {global && initialPose && <option value={currentRadarRegion}>Current view</option>}
              {!global && <option value="auto">Auto focus</option>}
              {!global && <option value="national">United States</option>}
              {(global ? globalRadarRegions : radarRegions).map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!layer && !problem && (
        <p role="status" aria-label="Radar status">
          {statusMessage}
        </p>
      )}
      {canRetry && (
        <button type="button" className="radar-retry" onClick={retry}>
          Retry {provider}
        </button>
      )}
    </div>
  );
}

export function StormRadarCoverage({
  coverage,
  problem,
}: {
  coverage: boolean | undefined;
  problem: boolean;
}) {
  return (
    <>
      {coverage === false && (
        <p className="radar-coverage" role="status">
          <strong>No radar coverage here.</strong> The reported track is still available.
        </p>
      )}
      {coverage === undefined && !problem && (
        <p className="radar-coverage" role="status">
          Checking radar coverage…
        </p>
      )}
    </>
  );
}
