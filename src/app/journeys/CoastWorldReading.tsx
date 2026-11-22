import type { ObservationFrame } from "../observations/types";

export function CoastWorldReading({ frame }: { frame: ObservationFrame | undefined }) {
  const arrival = frame?.modeledArrival;
  if (!frame || !arrival) return null;
  return (
    <div className="recorded-anchors coast-buoy-arrival" aria-hidden="true">
      <span
        data-observation-anchor=""
        data-compact-anchor=""
        data-lon={arrival.lon}
        data-lat={arrival.lat}
        data-arrival={frame.at === arrival.at || undefined}
      />
    </div>
  );
}
