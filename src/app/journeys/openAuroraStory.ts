import type { ObservatoryProps } from "../observatoryProps";
import type { Visit } from "../visitor/library";
import type { JourneyArrival } from "./connectedStops";

export function openAuroraStory(
  { views, aurora }: ObservatoryProps,
  id: "aurora" | "sun",
  saved: Visit | undefined,
  arrival: JourneyArrival | undefined,
) {
  const moment = saved?.position.moment;
  if (arrival?.city) views.skyCity.restore(arrival.city);
  views.observations.setMap(arrival?.map ?? moment?.map ?? false);
  if (arrival?.aurora) aurora.restore(arrival.aurora, arrival.pose);
  if (id === "sun") {
    views.sun.open(saved?.position.solar, moment, saved?.position.solarXray);
  } else if (!arrival?.aurora) {
    if (moment?.at !== undefined) aurora.hold(moment);
    aurora.start(moment?.choice === "south" ? -1 : moment?.choice === "north" ? 1 : undefined, !!moment);
  }
}
