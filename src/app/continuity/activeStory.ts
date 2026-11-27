import type { ObservatoryProps } from "../observatoryProps";
import { pacificId } from "../pacific/pacificMoment";

export function activeStory(props: ObservatoryProps) {
  const { observations, tonight, sun, floatDive } = props.views;
  if (props.pacific.visible) return pacificId;
  if (observations.entry) return observations.entry;
  if (floatDive.active) return "float";
  if (props.radar.active) return "radar";
  if (tonight.active) {
    if (tonight.view?.lunarDeparture || tonight.view?.moonfall) return "moonfall";
    if (tonight.view?.radiantTrail) return "meteors";
    return tonight.entry.mode;
  }
  if (sun.active) return "sun";
  return props.aurora.run || props.aurora.requested ? "aurora" : null;
}
