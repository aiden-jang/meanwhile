import { describe, expect, it } from "vitest";
import { solarClockReading } from "./solarClockReading";

describe("landing sunlight readout", () => {
  it("keeps the rail width stable across UTC midnight and announces the new day", () => {
    const before = solarClockReading(Date.UTC(2026, 11, 31, 23, 59));
    const after = solarClockReading(Date.UTC(2027, 0, 1, 0, 0));
    expect(before.clock).toBe("23:59 UTC");
    expect(after.clock).toBe("00:00 UTC");
    expect(after.clock.length).toBe(before.clock.length);
    expect(before.description).toBe("31 Dec · 23:59 UTC");
    expect(after.description).toBe("1 Jan · 00:00 UTC");
    expect(after.iso).toBe("2027-01-01T00:00:00.000Z");
  });
});
