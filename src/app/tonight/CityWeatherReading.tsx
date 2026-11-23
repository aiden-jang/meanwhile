import type { useMapLayers } from "../useMapLayers";
import type { CityWeatherLayers, CityWeatherVisit } from "./cityWeather";
import { LayerVisibility } from "../LayerCatalogue";
import { layerTime } from "../layerTime";
import { skyTimeFormats } from "./SkyEarthReading";
import "./city-weather.css";

export function CityWeatherReading({
  visit,
  controls,
  change,
  back,
}: {
  visit: CityWeatherVisit;
  controls: ReturnType<typeof useMapLayers>;
  change: (layer: keyof CityWeatherLayers, on: boolean) => void;
  back: () => void;
}) {
  const { city, at, layers } = visit;
  const clock = skyTimeFormats(city.zone).local;
  const wind = controls.weather.wind;
  const rows = [
    {
      id: "radar",
      name: "Storm radar",
      source: "RainViewer",
      at: controls.radar?.at,
      held: controls.radar?.at !== undefined && controls.radarAt !== controls.radar.at,
    },
    {
      id: "wind",
      name: "Surface wind",
      source: "NOAA GFS forecast",
      at: wind?.frame?.at,
      held: wind?.lastAvailable,
    },
  ] as const;
  return (
    <section
      className="city-weather-reading"
      aria-labelledby="city-weather-title"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || document.querySelector(":popover-open")) return;
        event.preventDefault();
        event.stopPropagation();
        back();
      }}
    >
      <button type="button" className="layer-story-link" onClick={back}>
        Back to local sky
      </button>
      <h2 id="city-weather-title" tabIndex={-1}>
        Live layers near {city.name}
      </h2>
      <div className="city-weather-rows">
        {rows.map((row) => {
          const feed = controls.feeds.find(({ id }) => id === row.id);
          return (
            <div className="city-weather-row" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <p>
                  {row.source} ·{" "}
                  {layers[row.id] ? (
                    row.at === undefined ? (
                      feed?.state === "failed" ? (
                        "Unavailable"
                      ) : feed?.state === "ok" ? (
                        "No data displayed"
                      ) : (
                        "Loading"
                      )
                    ) : (
                      <>
                        <time dateTime={new Date(row.at).toISOString()}>{layerTime(row.at)}</time>
                        {row.held ? " · last available" : ""}
                      </>
                    )
                  ) : (
                    "Off"
                  )}
                </p>
              </div>
              <LayerVisibility
                layer={row.id}
                on={layers[row.id]}
                disabled={false}
                onChange={(on) => change(row.id, on)}
              />
            </div>
          );
        })}
      </div>
      <div className="sky-held-reading">
        <span>Local sky held at</span>
        <time dateTime={new Date(at).toISOString()}>{clock.format(at)}</time>
      </div>
    </section>
  );
}
