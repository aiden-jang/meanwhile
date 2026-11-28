import { mapLayerNames, type MapLayer } from "./layerVisibility";
import type { FeedStatus } from "./feedStatus";
import { layerHealth, layerMetadata } from "./layerMetadata";
import type { useMapLayers } from "./useMapLayers";
import { LayerIcon } from "./LayerIcon";

const groups: { name: string; layers: MapLayer[] }[] = [
  { name: "Weather & sky", layers: ["radar", "wind", "lightning", "aurora"] },
  { name: "Reported events", layers: ["earthquakes", "cyclones", "fires", "floods", "volcanoes"] },
];

export function LayerVisibility({
  layer,
  on,
  disabled,
  onChange,
}: {
  layer: MapLayer;
  on: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="layer-visibility"
      aria-label={mapLayerNames[layer]}
      aria-description={`Toggle ${mapLayerNames[layer].toLowerCase()} visibility`}
      aria-pressed={on && !disabled}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <span className="layer-switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export function LayerCatalogue({
  controls,
  quiet,
  disabled,
  onInspect,
  feeds,
  count,
  archived,
}: {
  feeds: FeedStatus;
  count: number;
  archived: boolean;
  controls: ReturnType<typeof useMapLayers>;
  quiet: (id: MapLayer) => string | null;
  disabled: (id: MapLayer) => boolean;
  onInspect: (id: MapLayer) => void;
}) {
  return (
    <div className="layer-list" data-inspecting={controls.inspector !== null || undefined}>
      {groups.map((group) => (
        <section
          className="layer-group"
          aria-label={group.name}
          key={group.name}
          hidden={group.name === "Reported events" && controls.inspector !== null}
        >
          <h2 hidden={controls.inspector !== null}>{group.name}</h2>
          {group.layers.map((id) => {
            const on = controls.enabled[id] && !disabled(id);
            const sources = feeds.rows.filter((row) => layerMetadata[id].sources.includes(row.id));
            const health = on && !archived ? layerHealth(id, feeds.rows) : null;
            const healthy =
              on && !archived && sources.length > 0 && sources.every((row) => row.state === "ok") && !health;
            const detail =
              health ||
              (id === "radar" && on && controls.radar?.at
                ? new Date(controls.radar.at).toISOString().slice(11, 16) + " UTC scan"
                : id === "earthquakes" && on
                  ? count.toLocaleString() + " filtered reports"
                  : null);
            return (
              <div
                key={id}
                className="layer-row"
                data-on={on || undefined}
                hidden={controls.inspector !== null}
              >
                <div className="layer-summary" data-detail={!!detail || undefined}>
                  <button
                    type="button"
                    id={`inspect-${id}`}
                    className="layer-inspect"
                    aria-label={`${mapLayerNames[id]} details`}
                    aria-describedby={
                      detail ? `layer-${id}-detail layer-${id}-coverage` : `layer-${id}-coverage`
                    }
                    onClick={() => onInspect(id)}
                  >
                    <span className="field-layer-icon">
                      <LayerIcon layer={id} />
                      {healthy && <i data-healthy="" aria-hidden="true" />}
                    </span>
                    <span className="layer-name">{mapLayerNames[id]}</span>
                    <svg
                      className="layer-chevron"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                  {detail && (
                    <small id={`layer-${id}-detail`} className="field-layer-detail">
                      {detail}
                    </small>
                  )}
                  <small id={`layer-${id}-coverage`} className="sr-only">
                    {disabled(id)
                      ? "Unavailable in this archive"
                      : ((controls.enabled[id] ? quiet(id) : null) ?? layerMetadata[id].coverage)}
                  </small>
                </div>
                <LayerVisibility
                  layer={id}
                  on={controls.enabled[id]}
                  disabled={disabled(id)}
                  onChange={(on) => controls.change(id, on)}
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
