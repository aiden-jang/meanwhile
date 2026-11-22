import type { ObservatoryProps } from "../Observatory";
import type { SkyPosition } from "../tonight/skyMoment";
import type { Visit } from "../visitor/library";
import type { JourneyArrival } from "./connectedStops";

export function openSkyStory(
  views: ObservatoryProps["views"],
  id: "sky" | "meteors" | "moonfall",
  saved: Visit | undefined,
  arrival: JourneyArrival | undefined,
  nightfall: SkyPosition | undefined,
  fresh: boolean,
  origin: ObservatoryProps["views"]["tonight"]["view"],
) {
  const savedSky = saved?.position.sky ?? saved?.position.moment?.sky;
  if (savedSky) views.skyCity.select(savedSky.city);
  const position = nightfall ?? savedSky;
  const map = id === "sky" && (arrival?.map ?? !!position?.map);
  const resume =
    id === "sky" && position && arrival?.pose && (map || position.orbit)
      ? { ...position, reference: arrival.pose }
      : position;
  if (id === "sky" || arrival?.skyDeparture) views.observations.setMap(map);
  views.tonight.open(id, resume ?? (fresh && id !== "moonfall" ? null : undefined), !!nightfall, origin);
}
