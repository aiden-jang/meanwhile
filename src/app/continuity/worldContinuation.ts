import { onward } from "../journeys/catalogue";
import { storyPlace } from "../discovery/places";
import type { MapLayer } from "../layerVisibility";
import { discharge } from "../observations/riverGauges";
import type { ObservatoryProps } from "../observatoryProps";
import { searchStories } from "../storyIndex";
import { stations, pressureAt, timeIso } from "../tonga/tongaTimeline";
import type { Visit } from "../visitor/library";
import type { WorldSubject } from "./worldSubject";

const layer: Record<string, MapLayer> = {
  rupture: "earthquakes",
  fault: "earthquakes",
  katrina: "cyclones",
  lights: "cyclones",
  kilauea: "volcanoes",
  tonga: "volcanoes",
  megaflash: "lightning",
  fire: "fires",
  smoke: "fires",
  dust: "wind",
  rain: "radar",
  "atmospheric-river": "wind",
  wind: "wind",
  float: "wind",
  drifter: "wind",
  swell: "wind",
  reef: "wind",
  river: "floods",
  north: "aurora",
  aurora: "aurora",
  radar: "radar",
};

export function pressureSubject(station: (typeof stations)[number], minute: number): WorldSubject {
  const pressure = pressureAt(station, minute);
  return {
    point: station,
    from: "Tonga’s shockwave",
    storyId: "tonga",
    title: `Explore ${station.name}`,
    layer: "radar",
    ...(station.id === "PHNL" ? { stories: ["pacific", "kilauea"] } : {}),
    zoom: 2.2,
    reading: {
      label: "Recorded station pressure",
      value: pressure === null ? undefined : `${pressure.toFixed(2)} hPa`,
      at: Date.parse(timeIso(minute)),
    },
  };
}

export function worldContinuation(
  props: ObservatoryProps,
  active: string | null,
  visit: () => Visit | null,
): WorldSubject | undefined {
  const story = searchStories.find(({ id }) => id === active);
  if (!story) return;
  const { id, title: from } = story;
  const frame = props.views.observations.view?.frame;
  const moment = visit()?.position.moment;
  const nextLayer = layer[id];
  const subject = (point: WorldSubject["point"], reading?: WorldSubject["reading"]): WorldSubject => ({
    point,
    from,
    storyId: id,
    ...(onward[id] ? { stories: [onward[id][0]] } : {}),
    ...(nextLayer ? { layer: nextLayer } : {}),
    ...(reading ? { reading } : {}),
  });

  if (id === "float" && props.views.floatDive.view) {
    const { profile, read, source } = props.views.floatDive.view;
    const sample = profile.samples[read().index];
    if (sample)
      return {
        ...subject(
          { ...profile, name: "Argo float" },
          {
            label: source === "recorded" ? "Recorded Argo sample" : "Argo sample",
            value: `${sample.temperature.toFixed(2)} °C · ${Math.round(sample.depth).toLocaleString()} m`,
            at: profile.at,
          },
        ),
        stories: ["pacific", "drifter"],
        title: "Surface at the float",
      };
  }
  if (id === "tonga" && moment?.choice && moment.at !== undefined && moment.chapter === "pressure") {
    const station = stations.find(({ id }) => id === moment.choice);
    if (station) {
      const date = new Date(moment.at);
      return pressureSubject(station, date.getUTCHours() * 60 + date.getUTCMinutes());
    }
  }
  if (id === "river") {
    const selected = moment?.chapter?.startsWith("gauge:") ? moment.chapter.slice(6) : undefined;
    const gauge =
      frame?.gauges?.find(({ id }) => id === selected) ?? frame?.gauges?.find(({ available }) => available);
    const point = gauge && frame?.marks?.find(({ id }) => id === gauge.id);
    if (gauge && point)
      return subject(
        { ...point, name: gauge.label },
        {
          label: "USGS river gauge",
          value: gauge.value === undefined ? undefined : discharge(gauge.value),
          at: frame?.at,
        },
      );
  }
  if (id === "drifter" || id === "swell" || id === "tide") {
    const point = frame?.marks?.[0];
    if (point) {
      const measurement = frame?.measurements?.[0];
      return subject(
        {
          ...point,
          name: id === "drifter" ? "the drifter’s position" : id === "tide" ? "the tide station" : "the buoy",
        },
        {
          label: measurement?.label ?? "Recorded reading",
          value: measurement?.value,
          at: frame?.at,
        },
      );
    }
  }
  if (id === "aurora" && props.aurora.run) {
    const { route, forecast } = props.aurora.run;
    return subject(
      { ...route.focus, name: "the forecast region" },
      {
        label: "NOAA aurora forecast",
        at: forecast.forecastAt,
      },
    );
  }
  if (id === "radar" && props.radar.view) {
    const { target, at } = props.radar.view;
    return subject({ ...target, name: "this radar view" }, { label: "RainViewer radar", at });
  }
  if (["sky", "meteors", "orbit"].includes(id)) {
    return subject(props.views.skyCity.city, {
      label: id === "orbit" ? "Predicted pass" : "Local sky",
      at: moment?.at ?? props.views.tonight.view?.at,
    });
  }
  const place = storyPlace(id);
  return place ? subject({ lon: place.lon, lat: place.lat, name: place.label }) : undefined;
}
