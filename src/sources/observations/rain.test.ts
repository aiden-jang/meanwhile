import { afterEach, expect, it, vi } from "vitest";
import { rain } from "./rain";

afterEach(() => vi.useRealTimers());

it("keeps an explicitly selected estimate when it rolls out of the recent window", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-22T16:45:00Z"));
  const request = new AbortController();
  const held = Date.parse("2026-11-19T16:30:00Z");
  const current = await rain.load("", request.signal);
  const restored = await rain.load("", request.signal, held);
  expect(current.frames.some(({ at }) => at === held)).toBe(false);
  const frame = restored.frames.find(({ at }) => at === held);
  expect(new URL(frame!.raster!.url).searchParams.get("TIME")).toBe("2026-11-19T16:30:00Z");
});
