import { formatDelta, formatDuration, formatKm, formatPace } from "./format.js";

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
});
