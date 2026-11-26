import type { WavePin } from "./RecordedWaves";

export function WaveStationLabels({ pins, interactive }: { pins: WavePin[] | null; interactive: boolean }) {
  return (
    <div className="recorded-anchors" aria-label={pins ? "Seismic stations" : undefined}>
      {pins ? (
        pins.map(({ id, lon, lat, name, reached, slot, action, activate }) => (
          <button
            key={id}
            type="button"
            aria-label={interactive ? action : name}
            disabled={!interactive}
            title={name}
            data-observation-anchor=""
            data-compact-anchor=""
            data-wave-station={id}
            data-station-slot={slot}
            data-second={slot === "second" || undefined}
            data-projection-anchor={slot === "first" || undefined}
            data-reached={reached || undefined}
            data-lon={lon}
            data-lat={lat}
            onClick={(event) => activate(event.currentTarget)}
          >
            <i aria-hidden="true" />
            <span aria-hidden="true">{slot ? name.split(",")[0] : id}</span>
          </button>
        ))
      ) : (
        <span aria-hidden="true" data-observation-anchor="" data-lon={142.373} data-lat={38.297}>
          Epicenter
        </span>
      )}
    </div>
  );
}
