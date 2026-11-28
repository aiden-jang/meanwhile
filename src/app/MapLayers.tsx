import { useLayerOverview } from "./field/useLayerOverview";
import { NearbyReadings } from "./field/NearbyReadings";
import { QuakeReading } from "./field/QuakeReading";
import type { layerFieldVisit } from "./field/layerFieldVisit";
import "./field/layers-field.css";
import { LayerStoryLink } from "./LayerStoryLink";
import { useRadarRewind } from "./useRadarRewind";
import type { CameraState } from "../globe/controls";
import { useReadingArrival } from "./useReadingArrival";
import { lazy, Suspense, useLayoutEffect, useRef, type ReactNode, type KeyboardEventHandler } from "react";
import { PlaceContext, PlaceInspection, type PlaceContextProps } from "./discovery/PlaceContext";
import type { usePlaceInspection } from "./discovery/usePlaceInspection";
import { mapLayerNames, type MapLayer } from "./layerVisibility";
import type { useMapLayers } from "./useMapLayers";
import type { FeedStatus } from "./feedStatus";
import { weatherLayers, type WeatherLayerId } from "./weatherLayers";
import type { Aurora } from "../sources/aurora";
import { layerTime } from "./layerTime";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import { LayerCatalogue } from "./LayerCatalogue";
import { LayerInspectorHeading } from "./LayerInspectorHeading";
import { LayerSources } from "./LayerSources";
import { HazardList } from "./HazardList";
import { LayerExample, hasLayerExample } from "./LayerExample";
import { CutawayReports } from "./CutawayReports";
import type { DepthRecord } from "../data/depthRecords";
import { LayerRadar } from "./radar/LayerRadar";
import { QuietCycloneLinks, StormStoryLink } from "./storm/StormLinks";
import { useStormRadarVisit } from "./storm/useStormRadarVisit";
import { LiveStormReading, LiveStormSources } from "./storm/LiveStormReading";
import type { LiveStorm } from "./storm/useLiveStorm";
import "./map-layers.css";
import "./discovery/discovery.css";
const WeatherLayer = lazy(() =>
  import("./WeatherLayer").then(({ WeatherLayer }) => ({ default: WeatherLayer })),
);

export function MapLayers({
  controls,
  field,
  places,
  place,
  readCamera,
  panelVisible,
  onQuake,
  feeds,
  archived,
  aurora,
  children,
  window,
  markId,
  onHazard,
  flat,
  canDismiss,
  cityWeather,
  storm,
  onCloseStorm,
}: {
  controls: ReturnType<typeof useMapLayers>;
  field: ReturnType<typeof layerFieldVisit>;
  places: PlaceContextProps;
  place: ReturnType<typeof usePlaceInspection> & {
    cutaway?: DepthRecord | undefined;
    backToCutaway: () => void;
    allLayers: () => void;
    reading?: ReactNode;
    closeReading: () => void;
    inContext?: boolean;
  };
  readCamera: () => CameraState;
  panelVisible: boolean;
  onQuake: (id: string) => void;
  feeds: FeedStatus;
  archived: boolean;
  aurora: Aurora | null;
  children: ReactNode;
  window: ReactNode;
  markId: string | null;
  onHazard: (id: string) => void;
  flat: boolean;
  canDismiss: boolean;
  cityWeather: boolean;
  storm: LiveStorm | null;
  onCloseStorm: () => void;
}) {
  const navigation = useStoryNavigation();
  const rewindPoint = controls.radar && !cityWeather && !storm ? controls.rewindPoint : undefined;
  const layer = rewindPoint || cityWeather || storm ? null : controls.inspector;
  const destination =
    layer === "aurora" ? "aurora" : layer === "wind" ? "wind" : layer === "lightning" ? "lightning" : null;
  const rewindAt = controls.radar?.image ? controls.radar.at : undefined;
  const { reveal, openRewind, closeRewind } = useRadarRewind(controls, readCamera);
  const panel = useRef<HTMLElement>(null);
  const { reports, health, hazardKind, groups, quietCyclones, quakeCount, quiet } = useLayerOverview(
    places,
    controls,
    feeds,
    archived,
    layer,
    aurora,
  );
  const inspectingPlace = !!place.point;
  const findReturn = navigation?.findReturn;
  const findBack = findReturn?.destination === (layer ?? place.point?.name) ? findReturn?.back : undefined;
  const stormId = storm?.storm.id;
  const stormRadar = useStormRadarVisit(stormId);
  useReadingArrival(
    panel,
    stormId ?? (rewindPoint ? "rewind" : inspectingPlace ? "place" : (layer ?? "overview")),
  );
  useLayoutEffect(() => {
    if (stormId && panelVisible) {
      document.getElementById("chrome-rail")?.scrollTo({ top: 0 });
      document.getElementById("live-storm-title")?.focus({ preventScroll: true });
    }
  }, [stormId, panelVisible]);
  useLayoutEffect(() => {
    if (inspectingPlace || rewindPoint) document.getElementById("chrome-rail")?.scrollTo({ top: 0 });
  }, [inspectingPlace, rewindPoint]);
  const disabled = (id: MapLayer) => archived && (id === "aurora" || id === "radar" || id in weatherLayers);
  const listScroll = useRef(0);
  const exampleLayer = useRef<MapLayer>();
  const inspect = (id: MapLayer) => {
    listScroll.current = document.getElementById("chrome-rail")?.scrollTop ?? 0;
    exampleLayer.current = id;
    document.getElementById(`inspect-${id}`)?.focus({ preventScroll: true });
    field.inspect(id);
    requestAnimationFrame(() => {
      document.getElementById("chrome-rail")?.scrollTo({ top: 0 });
      document.getElementById("layer-inspector-title")?.focus({ preventScroll: true });
    });
  };
  const back = () => {
    exampleLayer.current = undefined;
    controls.inspect(null);
    requestAnimationFrame(() => {
      document.getElementById("chrome-rail")?.scrollTo({ top: listScroll.current });
      document.getElementById(`inspect-${layer}`)?.focus({ preventScroll: true });
    });
  };

  const dismissReading: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key !== "Escape" || document.querySelector(":popover-open")) return;
    if (stormRadar?.open) {
      event.preventDefault();
      event.stopPropagation();
      stormRadar.back();
      return;
    }
    if (!canDismiss) return;
    if (!rewindPoint && !inspectingPlace && !layer) return;
    event.preventDefault();
    event.stopPropagation();
    if (rewindPoint) closeRewind();
    else if (findBack) findBack();
    else if (inspectingPlace) {
      place.close();
      document.getElementById("globe-view")?.focus({ preventScroll: true });
    } else back();
  };

  if (place.cutaway)
    return (
      <section className="map-layers" aria-label="Map layers">
        <CutawayReports
          {...reports}
          record={place.cutaway}
          back={place.backToCutaway}
          allLayers={place.allLayers}
          select={onQuake}
          reading={place.reading}
          onClose={place.closeReading}
          hasContext={place.inContext ?? false}
        />
      </section>
    );
  return (
    <section
      ref={panel}
      hidden={cityWeather}
      className="map-layers"
      data-layer={layer ?? undefined}
      aria-label="Map layers"
      onKeyDown={dismissReading}
    >
      {field.report && (
        <QuakeReading
          report={field.report}
          flat={flat}
          visible={panelVisible}
          back={() => history.back()}
          readCamera={readCamera}
        />
      )}
      <div hidden={!!field.report}>
        {storm && !stormRadar?.open && <LiveStormReading {...storm} back={onCloseStorm} />}
        {place.point && !rewindPoint && !storm && (
          <PlaceInspection
            {...reports}
            point={place.point}
            hasContext={place.inContext ?? false}
            backLabel={!layer && findBack ? "Back to Find" : undefined}
            close={
              (!layer && findBack) ||
              (() => {
                place.close();
                document.getElementById("globe-view")?.focus({ preventScroll: true });
              })
            }
            selectQuake={onQuake}
            selectHazard={onHazard}
            radarAt={rewindAt}
            onRewind={
              controls.radar && controls.canRewind?.(place.point) ? () => openRewind(place.point!) : undefined
            }
          />
        )}
        {!rewindPoint && !storm && controls.isolated && (
          <div className="layer-isolation" role="status">
            <span>Only {mapLayerNames[controls.isolated].toLowerCase()}</span>
            <button type="button" onClick={() => controls.isolate(null)}>
              Restore layers
            </button>
          </div>
        )}
        {layer && (
          <LayerInspectorHeading
            compact={layer === "radar" && !storm && !cityWeather && !archived}
            layer={layer}
            onBack={findBack ?? back}
            backLabel={findBack ? "Back to Find" : "Back to layers"}
            enabled={controls.enabled[layer]}
            disabled={disabled(layer)}
            onToggle={(on) => controls.change(layer, on)}
          >
            {disabled(layer) ? (
              <p role="status">
                Return to live to view this layer. This source has no data for the selected archive.
              </p>
            ) : !controls.enabled[layer] ? (
              <p>This layer is hidden. Turn it on to show its observations.</p>
            ) : layer !== "radar" && !(quietCyclones && !groups.length) && quiet(layer) ? (
              <p role="status">{quiet(layer)}</p>
            ) : null}
            {exampleLayer.current === layer &&
              panelVisible &&
              !inspectingPlace &&
              controls.visible[layer] &&
              hasLayerExample(layer) && <LayerExample key={layer} layer={layer} />}
          </LayerInspectorHeading>
        )}
        <LayerRadar
          fieldOpen={!!field.report}
          {...{
            controls,
            rewindPoint,
            rewindAt,
            closeRewind,
            reveal,
            layer,
            flat,
            panelVisible,
            readCamera,
            dismissReading,
          }}
          storm={storm && stormRadar ? { ...storm.storm, visit: stormRadar } : undefined}
        />
        {(layer === "radar" || layer === "earthquakes") && !archived && (
          <NearbyReadings
            {...{ reports, readCamera, inspecting: !!field.report }}
            enabled={controls.visible.earthquakes}
            enable={() => controls.change("earthquakes", true)}
            select={(quake) => field.open({ quake, from: layer })}
            follow={layer === "radar" ? () => navigation?.openRadar(controls.radarAt, flat) : undefined}
          />
        )}
        {storm && (
          <>
            <StormStoryLink trigger={stormRadar?.open ? "storm-radar-katrina" : "live-storm-katrina"} />
            <LiveStormSources storm={storm.storm} />
          </>
        )}
        <div hidden={!!rewindPoint || !!storm}>
          {layer === null && Object.values(controls.enabled).every((on) => !on) && (
            <div className="layer-note">
              <p role="status">All layers are off.</p>
              <button
                type="button"
                className="layer-story-link"
                onClick={() => controls.change("earthquakes", true)}
              >
                Show earthquakes
              </button>
            </div>
          )}
          <LayerCatalogue
            controls={controls}
            quiet={quiet}
            disabled={disabled}
            onInspect={inspect}
            feeds={feeds}
            count={quakeCount}
            archived={archived}
          />
          {!archived && (
            <details className="layer-place" hidden={layer !== null}>
              <summary>Find a place</summary>
              <p className="layer-note">Tap the globe or map for nearby reports, or choose a city below.</p>
              <PlaceContext {...reports} />
            </details>
          )}
          <div hidden={layer !== "earthquakes"}>{children}</div>
          {hazardKind && (
            <section aria-label={`${mapLayerNames[layer!]} reports`} className="layer-reports">
              {window}
              <p>
                Reported events in the selected window. This window is shared with the earthquake reports.
              </p>
              {groups.length ? (
                <HazardList hazards={groups} markId={markId} onHazard={onHazard} inline />
              ) : quietCyclones ? (
                <QuietCycloneLinks at={controls.radarAt} map={flat} />
              ) : (
                <p role="status">
                  {!controls.enabled[layer!]
                    ? "Enable this layer to see reports."
                    : (health ??
                      "No matching reports from the available sources. This does not establish an absence of activity.")}
                </p>
              )}
            </section>
          )}
          {layer === "aurora" && controls.enabled.aurora && !archived && (
            <p className="layer-note">
              {aurora ? (
                <>
                  {aurora.estimatedTime ? (
                    "Forecast time not supplied by NOAA."
                  ) : (
                    <>
                      <span>Forecast valid for </span>
                      <time dateTime={new Date(aurora.forecastAt).toISOString()}>
                        {layerTime(aurora.forecastAt)}
                      </time>
                      .
                    </>
                  )}{" "}
                  Peak modeled probability: {aurora.peak}%. This is a forecast, not an observation of visible
                  aurora.
                </>
              ) : (
                (health ?? "No forecast is available yet.")
              )}
            </p>
          )}
          {controls.active &&
            (Object.keys(weatherLayers) as WeatherLayerId[]).map(
              (id) =>
                controls.enabled[id] && (
                  <div key={id} hidden={layer !== id}>
                    <Suspense
                      fallback={<p role="status">Loading {weatherLayers[id].label.toLowerCase()}…</p>}
                    >
                      <WeatherLayer
                        id={id}
                        suspended={controls.suspended}
                        onView={controls.updateWeather}
                        selectedAt={controls.selectedTimes[id]}
                        onSelect={controls.selectTime}
                      />
                    </Suspense>
                  </div>
                ),
            )}
          {destination && !archived && (
            <LayerStoryLink
              id={destination}
              at={destination === "aurora" ? aurora?.forecastAt : controls.selectedTimes[destination]}
              map={flat}
            />
          )}
          {layer && !archived && (
            <button
              type="button"
              className="layer-solo"
              onClick={() => controls.isolate(controls.isolated === layer ? null : layer)}
            >
              {controls.isolated === layer ? "Restore chosen layers" : "Show only this layer"}
            </button>
          )}
          {layer && <LayerSources layer={layer} feeds={feeds} />}
        </div>
      </div>
    </section>
  );
}
