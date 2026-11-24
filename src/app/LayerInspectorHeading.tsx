import { DetailPanelHeading } from "./DetailPanelHeading";
import { LayerVisibility } from "./LayerCatalogue";
import { hasLayerExample } from "./LayerExample";
import { LayerIcon } from "./LayerIcon";
import { layerMetadata } from "./layerMetadata";
import { mapLayerNames, type MapLayer } from "./layerVisibility";

export function LayerInspectorHeading({
  layer,
  onBack,
  enabled,
  disabled,
  onToggle,
}: {
  layer: MapLayer;
  onBack: () => void;
  enabled: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
}) {
  const visibility = <LayerVisibility layer={layer} on={enabled} disabled={disabled} onChange={onToggle} />;
  const coverage = <p>{layerMetadata[layer].coverage}</p>;
  if (layer === "radar")
    return (
      <DetailPanelHeading
        id="layer-inspector-title"
        title={mapLayerNames.radar}
        backLabel="Back to layers"
        onBack={onBack}
      >
        {coverage}
        {visibility}
      </DetailPanelHeading>
    );

  return (
    <>
      <button className="reading-back" type="button" onClick={onBack}>
        Back to layers
      </button>
      <div>
        <h2 id="layer-inspector-title" tabIndex={-1}>
          {hasLayerExample(layer) && <LayerIcon layer={layer} />}
          {mapLayerNames[layer]}
        </h2>
        {visibility}
      </div>
      {coverage}
    </>
  );
}
