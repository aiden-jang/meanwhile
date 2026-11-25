import { honoluluTrigger } from "../tonga/honolulu";
import { floatExploreTrigger } from "../float/firstProfile";

export const backToExplore = "Back to Explore";

export function isWorldStoryMarker(trigger: string) {
  return trigger === honoluluTrigger || trigger === floatExploreTrigger;
}
