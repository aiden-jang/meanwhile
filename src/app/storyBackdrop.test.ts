import { expect, it } from "vitest";
import { observatoryBackdrop } from "./storyBackdrop";

const base = {
  browsingStories: false,
  depthFocus: null,
  floatDive: { active: false },
  aurora: { run: null },
  sun: { active: false },
};

it("keeps the float's ocean section free of unrelated measurements", () => {
  const props = observatoryBackdrop({
    ...base,
    floatDive: { active: true },
  });
  expect(props).toEqual({
    depthSink: false,
    cutaway: null,
    slab: null,
    figures: null,
    section: null,
    inspection: null,
    aurora: null,
  });
});

it("leaves other active stories and normal layers with their own source choices", () => {
  expect(observatoryBackdrop(base)).toEqual({});
  expect(observatoryBackdrop({ ...base, browsingStories: true }).aurora).toBeUndefined();
});
