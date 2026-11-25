import type { EarthStoryId } from "./catalogue";

export function storyClass(id: EarthStoryId, field: boolean, orbital: boolean) {
  if (id === "fault") return "field-journey fault-journey";
  if (id === "glacier") return "field-journey glacier-journey";
  if (field) return "field-journey";
  if (orbital) return "celestial-journey";
  return id === "bloom" || id === "nino" || id === "seafloor" ? `${id}-journey` : "";
}

export const startLabels: Partial<Record<EarthStoryId, string>> = {
  seafloor: "Begin the descent",
  aral: "Follow the shoreline",
};
