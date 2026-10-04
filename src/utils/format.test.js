import {
  formatClock,
  formatDay,
  formatDelta,
  formatDuration,
  formatKm,
  formatPace,
  formatUtcOffset,
} from "./format.js";

describe("format", () => {
  it("formats durations as hours and minutes", () => {
    expect(formatDuration(0)).toBe("0h00");
    expect(formatDuration(3725)).toBe("1h02");
    expect(formatDuration(-300)).toBe("-0h05");
    expect(formatDuration(null)).toBe("–");
  });

  it("signs deltas", () => {
    expect(formatDelta(180)).toBe("+0h03");
    expect(formatDelta(-300)).toBe("-0h05");
  });

  it("formats distance and pace", () => {
    expect(formatKm(6012)).toBe("6.0 km");
    expect(formatPace(500)).toBe("8:20/km");
    expect(formatPace(undefined)).toBe("–");
  });

  it("reads an epoch on the race's wall clock, whatever the viewer's zone", () => {
    // GRP 2026: the start, and the arrival at Pierrefitte, at UTC+2.
    expect(formatClock(1787281427, 7200)).toBe("Fri 05:03");
    expect(formatClock(1787346348, 7200)).toBe("Fri 23:05");
    expect(formatClock(1787346348, null)).toBe("Fri 21:05");
    expect(formatClock(null, 7200)).toBe("–");
    expect(formatDay(1787281427, 7200)).toBe("Fri 21 Aug");
  });

  it("names the offset", () => {
    expect(formatUtcOffset(7200)).toBe("UTC+2");
    expect(formatUtcOffset(-16200)).toBe("UTC−4:30");
    expect(formatUtcOffset(null)).toBe("UTC");
  });
});
