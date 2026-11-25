import { useLayoutEffect, useRef } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import { observationTracks, projectedFixes } from "../../globe/observationTrack";
import type { ObservationMark } from "../observations/types";
import { EvidenceConnector } from "../observations/EvidenceConnector";
import { IcebergHandle } from "./IcebergHandle";
import { BREAKUP, nameOf, type Fix } from "./icebergTimeline";

export function IcebergWorld({
  marks,
  fragment,
  select,
  linked,
  day,
  fixes,
  onGrab,
  onSeek,
}: {
  marks: readonly ObservationMark[];
  fragment: string;
  select: (index: number) => void;
  linked: boolean;
  day: number;
  fixes: readonly Fix[];
  onGrab: () => void;
  onSeek: (day: number) => void;
}) {
  const drawing = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const svg = drawing.current;
    if (!svg) return;
    observationTracks.set(svg, { fixes, day, landmark: fragment === "A" ? BREAKUP : undefined });
    refreshAnnotations();
  }, [day, fixes, fragment]);
  useLayoutEffect(() => {
    const svg = drawing.current;
    return () => {
      if (!svg) return;
      observationTracks.delete(svg);
      projectedFixes.delete(svg);
    };
  }, []);
  const fix = fixes.find(([at]) => at === day);
  return (
    <>
      <div className="iceberg-fragments" aria-label="Recorded iceberg positions">
        <svg ref={drawing} data-observation-track="" aria-hidden="true">
          <path data-track-guide="" />
          <path data-track-diamond="" />
        </svg>
        <span className="iceberg-landmark" data-track-landmark="" aria-hidden="true" hidden>
          23 Dec · satellite
        </span>
        {fix && (
          <IcebergHandle
            fix={fix}
            fragment={fragment}
            fixes={fixes}
            linked={linked}
            onGrab={onGrab}
            onSeek={onSeek}
          />
        )}
        {marks.map(
          ({ id, lon, lat }, index) =>
            id &&
            id !== fragment && (
              <button
                key={id}
                type="button"
                data-observation-anchor=""
                data-compact-anchor=""
                data-lon={lon}
                data-lat={lat}
                aria-label={`Inspect ${nameOf(id)}`}
                onClick={() => select(index)}
              >
                <span aria-hidden="true">{nameOf(id)}</span>
              </button>
            ),
        )}
        <span className="iceberg-coast-label" data-observation-anchor="" data-lon="-36.65" data-lat="-54.21">
          South Georgia
        </span>
      </div>
      {linked && <EvidenceConnector key={fragment} trace />}
    </>
  );
}

export const icebergSources = (
  <>
    <a
      href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
      target="_blank"
      rel="noreferrer"
    >
      UK Polar Data Centre tracks · OGL v3.0
    </a>
    <a
      href="https://science.nasa.gov/earth/earth-observatory/iceberg-a-68a-nears-south-georgia-147535/"
      target="_blank"
      rel="noreferrer"
    >
      Terra MODIS
    </a>
    <a
      href="https://science.nasa.gov/earth/earth-observatory/iceberg-goes-with-the-flow-147715/"
      target="_blank"
      rel="noreferrer"
    >
      Landsat 8
    </a>
    <a
      href="https://science.nasa.gov/earth/earth-observatory/pieces-of-iceberg-a-68a-147785/"
      target="_blank"
      rel="noreferrer"
    >
      NOAA-20 VIIRS
    </a>
  </>
);
