import { afterEach, expect, it, vi } from "vitest";
import {
  landingSolarTime,
  setSolarOffsetMinutes,
  solarOffsetMinutes,
  subscribeLandingSun,
} from "./landingSolarClock";

afterEach(() => setSolarOffsetMinutes(0));

it("publishes each selected minute once, bounded by the six-hour control", () => {
  const changed = vi.fn();
  const stop = subscribeLandingSun(changed);
  setSolarOffsetMinutes(-370);
  expect(solarOffsetMinutes()).toBe(-360);
  setSolarOffsetMinutes(-359.9);
  setSolarOffsetMinutes(NaN);
  expect(changed).toHaveBeenCalledTimes(1);
  setSolarOffsetMinutes(2_000);
  expect(solarOffsetMinutes()).toBe(360);
  stop();
  setSolarOffsetMinutes(0);
  expect(changed).toHaveBeenCalledTimes(2);
});

it("scrubs relative to the displayed instant across midnight and restores that minute", () => {
  const instant = Date.UTC(2026, 10, 26, 22, 58);
  expect(landingSolarTime(instant, 90)).toBe(Date.UTC(2026, 10, 27, 0, 28));
  expect(landingSolarTime(instant, 0)).toBe(instant);
});
