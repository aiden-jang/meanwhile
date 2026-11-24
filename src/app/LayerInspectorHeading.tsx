import type { ReactNode } from "react";
import { LayerVisibility } from "./LayerCatalogue";
import { hasLayerExample } from "./LayerExample";
import { LayerIcon } from "./LayerIcon";
import { layerMetadata } from "./layerMetadata";
import { mapLayerNames, type MapLayer } from "./layerVisibility";
import "./detail-panel.css";

export function LayerInspectorHeading({
  layer,
  onBack,
  backLabel,
  enabled,
  disabled,
  onToggle,
  children,
}: {
  layer: MapLayer;
  onBack: () => void;
  backLabel: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
  children: ReactNode;
}) {
  return (
    <>
      <header className="detail-panel-heading layer-inspector-return">
        <h2 id="layer-inspector-title" tabIndex={-1}>
          {layer !== "radar" && hasLayerExample(layer) && <LayerIcon layer={layer} />}
          {mapLayerNames[layer]}
        </h2>
        <button type="button" className="reading-back" onClick={onBack}>
          {backLabel}
        </button>
      </header>
      <div className="layer-inspector-heading">
        <div>
          <p>{layerMetadata[layer].coverage}</p>
          <LayerVisibility layer={layer} on={enabled} disabled={disabled} onChange={onToggle} />
        </div>
        {children}
      </div>
    </>
  );
}
