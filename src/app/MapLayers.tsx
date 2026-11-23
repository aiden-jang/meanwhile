import { LayerStoryLink } from "./LayerStoryLink";
import { CopyLink } from "./CopyLink";
import { rewindLink } from "./radar/rewindLink";
import { useRadarRewind } from "./useRadarRewind";
import { geographicCoordinates } from "../globe/orbitReadout";
import type { CameraState } from "../globe/controls";
import { quietLayer } from "./layerQuiet";
import { matches } from "../data/filter";
import { useReadingArrival } from "./useReadingArrival";
import {
  lazy,
  Suspense,
  useLayoutEffect,
  useRef,
  useMemo,
  type ReactNode,
  type KeyboardEventHandler,
} from "react";
import { PlaceContext, PlaceInspection, type PlaceContextProps } from "./discovery/PlaceContext";
import type { usePlaceInspection } from "./discovery/usePlaceInspection";
import { mapLayerNames, type MapLayer } from "./layerVisibility";
import type { useMapLayers } from "./useMapLayers";
import type { FeedStatus } from "./feedStatus";
import { weatherLayers, type WeatherLayerId } from "./weatherLayers";
import { layerHealth, layerMetadata } from "./layerMetadata";
import type { Aurora } from "../sources/aurora";
import { layerTime } from "./layerTime";
import { useStoryNavigation } from "./journeys/StoryNavigation";
import { LayerCatalogue, LayerVisibility } from "./LayerCatalogue";
import { LayerSources } from "./LayerSources";
import { HazardList } from "./HazardList";
import { LayerExample, hasLayerExample } from "./LayerExample";
import { LayerIcon } from "./LayerIcon";
import { CutawayReports } from "./CutawayReports";
import type { DepthRecord } from "../data/depthRecords";
import "./map-layers.css";
import "./discovery/discovery.css";
const RadarLayer = lazy(() =>
  import("./radar/RadarLayer").then(({ RadarLayer }) => ({ default: RadarLayer })),
);
const WeatherLayer = lazy(() =>
  import("./WeatherLayer").then(({ WeatherLayer }) => ({ default: WeatherLayer })),
);
const hazardKinds = { cyclones: "cyclone", fires: "fire", floods: "flood", volcanoes: "volcano" } as const;

export function MapLayers({
  controls,
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
}: {
  controls: ReturnType<typeof useMapLayers>;
  places: PlaceContextProps;
  place: ReturnType<typeof usePlaceInspection> & {
    cutaway?: DepthRecord | undefined;
    backToCutaway: () => void;
    allLayers: () => void;
    reading?: ReactNode;
    closeReading: () => void;
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
}) {
  const navigation = useStoryNavigation();
  const rewindPoint = controls.radar && !cityWeather ? controls.rewindPoint : undefined;
  const layer = rewindPoint || cityWeather ? null : controls.inspector;
  const destination =
    layer === "aurora" ? "aurora" : layer === "wind" ? "wind" : layer === "lightning" ? "lightning" : null;
  const rewindAt = controls.radar?.image ? controls.radar.at : undefined;
  const { reveal, openRewind, closeRewind } = useRadarRewind(controls, readCamera);
  const panel = useRef<HTMLElement>(null);
  const reports = {
    ...places,
    feeds: {
      ...places.feeds,
      rows: places.feeds.rows.filter(({ id }) =>
        id === "usgs" || id === "emsc"
          ? places.filters.sources.has(id)
          : Object.hasOwn(hazardKinds, id) && controls.visible[id],
      ),
    },
  };
  const inspectingPlace = !!place.point;
  useReadingArrival(panel, rewindPoint ? "rewind" : inspectingPlace ? "place" : (layer ?? "overview"));
  useLayoutEffect(() => {
    if (inspectingPlace || rewindPoint) document.getElementById("chrome-rail")?.scrollTo({ top: 0 });
  }, [inspectingPlace, rewindPoint]);
  const disabled = (id: MapLayer) => archived && (id === "aurora" || id === "radar" || id in weatherLayers);
  const listScroll = useRef(0);
  const exampleLayer = useRef<MapLayer>();
  const inspect = (id: MapLayer) => {
    listScroll.current = document.getElementById("chrome-rail")?.scrollTop ?? 0;
    exampleLayer.current = id;
    controls.inspect(id);
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
  const health = layer && !archived ? layerHealth(layer, feeds.rows) : null;
  const hazardKind = layer && layer in hazardKinds ? hazardKinds[layer as keyof typeof hazardKinds] : null;
  const groups = places.hazards.filter((group) => group.kind === hazardKind);
  const quakeCount = useMemo(() => {
    void places.revision;
    let count = 0;
    places.feed.store.forEach((quake) => {
      if (quake.primary.time <= places.at && matches(quake, places.filters, places.now)) count++;
    });
    return count;
  }, [places.feed, places.revision, places.at, places.filters, places.now]);
  const counts: Partial<Record<MapLayer, number>> = { earthquakes: quakeCount };
  for (const [id, kind] of Object.entries(hazardKinds))
    counts[id as MapLayer] = places.hazards.find((group) => group.kind === kind)?.rows.length ?? 0;
  if (aurora) counts.aurora = aurora.peak;
  if (controls.weather.wind?.frame) counts.wind = controls.weather.wind.frame.paths?.length ?? 0;
  if (controls.weather.lightning?.frame)
    counts.lightning = controls.weather.lightning.frame.marks?.length ?? 0;
  const quiet = (id: MapLayer) => quietLayer(id, feeds.rows, counts[id], archived);

  const dismissReading: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key !== "Escape" || !canDismiss || document.querySelector(":popover-open")) return;
    if (!rewindPoint && !inspectingPlace && !layer) return;
    event.preventDefault();
    event.stopPropagation();
    if (rewindPoint) closeRewind();
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
      {place.point && !rewindPoint && (
        <PlaceInspection
          {...reports}
          point={place.point}
          close={() => {
            place.close();
            document.getElementById("globe-view")?.focus({ preventScroll: true });
          }}
          selectQuake={onQuake}
          selectHazard={onHazard}
          radarAt={rewindAt}
          onRewind={
            controls.radar && controls.canRewind?.(place.point) ? () => openRewind(place.point!) : undefined
          }
        />
      )}
      {!rewindPoint && controls.isolated && (
        <div className="layer-isolation" role="status">
          <span>Only {mapLayerNames[controls.isolated].toLowerCase()}</span>
          <button type="button" onClick={() => controls.isolate(null)}>
            Restore layers
          </button>
        </div>
      )}
      {layer && (
        <div className="layer-inspector-heading">
          <button className="reading-back" type="button" onClick={back}>
            Back to layers
          </button>
          <div>
            <h2 id="layer-inspector-title" tabIndex={-1}>
              {hasLayerExample(layer) && <LayerIcon layer={layer} />}
              {mapLayerNames[layer]}
            </h2>
            <LayerVisibility
              layer={layer}
              on={controls.enabled[layer]}
              disabled={disabled(layer)}
              onChange={(on) => controls.change(layer, on)}
            />
          </div>
          <p>{layerMetadata[layer].coverage}</p>
          {disabled(layer) ? (
            <p role="status">
              Return to live to view this layer. This source has no data for the selected archive.
            </p>
          ) : !controls.enabled[layer] ? (
            <p>This layer is hidden. Turn it on to show its observations.</p>
          ) : layer !== "radar" && quiet(layer) ? (
            <p role="status">{quiet(layer)}</p>
          ) : null}
          {exampleLayer.current === layer &&
            panelVisible &&
            !inspectingPlace &&
            controls.visible[layer] &&
            hasLayerExample(layer) && <LayerExample key={layer} layer={layer} />}
        </div>
      )}
      <div
        className={rewindPoint ? "layer-player place-context place-inspection radar-rewind" : "layer-player"}
        hidden={layer !== "radar" && !rewindPoint}
      >
        {rewindPoint && (
          <header>
            <div>
              <h2 id="radar-rewind-title" tabIndex={-1}>
                Radar rewind
              </h2>
              <p className="place-coordinates">{geographicCoordinates(rewindPoint)}</p>
            </div>
            <button type="button" onClick={closeRewind}>
              Back to live
            </button>
          </header>
        )}
        {reveal && (
          <p role="status" className="radar-layer-note">
            Revealing radar…
          </p>
        )}
        {controls.radar && (
          <Suspense fallback={reveal ? null : <p role="status">Loading radar controls…</p>}>
            <RadarLayer
              suspended={controls.suspended || (!!rewindPoint && !panelVisible)}
              rewind={!!rewindPoint}
              dock={
                panelVisible && !controls.suspended && !reveal && (layer === "radar" || rewindPoint)
                  ? dismissReading
                  : undefined
              }
              hidden={!!reveal}
              onView={controls.updateRadar}
              initialAt={controls.selectedTimes.radar}
              onSelect={controls.selectTime}
            />
          </Suspense>
        )}
        {rewindPoint && !reveal && rewindAt !== undefined && (
          <CopyLink
            label="Copy radar link"
            format={(url) => rewindLink(url, readCamera(), rewindPoint, rewindAt, flat)}
          />
        )}
        {layer === "radar" && !archived && (
          <button
            type="button"
            id="open-explorer-radar"
            className="layer-story-link"
            onClick={() => navigation?.openRadar(controls.radarAt, flat)}
          >
            Follow a radar region <span>Guided view · same available scans</span>
          </button>
        )}
      </div>
      <div hidden={!!rewindPoint}>
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
        <LayerCatalogue controls={controls} quiet={quiet} disabled={disabled} onInspect={inspect} />
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
            <p>Reported events in the selected window. This window is shared with the earthquake reports.</p>
            {groups.length ? (
              <HazardList hazards={groups} markId={markId} onHazard={onHazard} inline />
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
                  <Suspense fallback={<p role="status">Loading {weatherLayers[id].label.toLowerCase()}…</p>}>
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
    </section>
  );
}
