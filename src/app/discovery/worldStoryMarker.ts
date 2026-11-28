import { honoluluTrigger, eruptionMarker } from "../tonga/honolulu";
import { floatExploreTrigger } from "../float/firstProfile";
import { hawaiiPlaces } from "./hawaiiPlaces";

export const backToExplore = "Back to Explore";

export function isWorldStoryMarker(trigger: string) {
  return (
    trigger === eruptionMarker ||
    trigger === honoluluTrigger ||
    trigger === floatExploreTrigger ||
    hawaiiPlaces.some((place) => place.trigger === trigger)
  );
}
