import type { GlobeProps } from "../globe/GlobeProps";
import type { AuroraRun } from "../sources/auroraRoute";

const clear: Partial<GlobeProps> = {
  depthSink: false,
  cutaway: null,
  slab: null,
  figures: null,
  section: null,
  inspection: null,
};

export function storyBackdrop(browsing: boolean, focus: GlobeProps["cutaway"] = null): Partial<GlobeProps> {
  return browsing ? { ...clear, cutaway: focus ? { ...focus, cameraOnly: true } : null } : {};
}

export function observatoryBackdrop(view: {
  browsingStories: boolean;
  depthFocus: GlobeProps["cutaway"];
  floatDive: { active: boolean };
  aurora: { run: AuroraRun | null };
  sun: { active: boolean };
}): Partial<GlobeProps> {
  if (view.aurora.run) return clear;
  if (view.floatDive.active || view.sun.active) return { ...clear, aurora: null };
  return storyBackdrop(view.browsingStories, view.depthFocus);
}
