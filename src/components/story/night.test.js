import { dayNightRatios, nightSpans, sunAltitude } from "./night.js";
import { report } from "./report.fixture.js";

// Epochs on the GRP 2026 weekend, at Vielle-Aure (42.83° N, 0.33° E), UTC+2.
const local = (iso) => Date.parse(`${iso}+02:00`) / 1000;
const VIELLE_AURE = [42.83, 0.33];

describe("sunAltitude", () => {
  it("puts the sun overhead at noon on the equator at the equinox", () => {
    // 2026-03-20 12:07 UTC is near solar noon at 0° E.
    expect(sunAltitude(Date.parse("2026-03-20T12:07:00Z") / 1000, 0, 0)).toBeGreaterThan(88);
  });

  it("finds civil dusk in the Pyrenees in late August between 21:00 and 21:30", () => {
    // Sunset there that evening is about 20:50 local; civil dusk about half an hour later.
    expect(sunAltitude(local("2026-08-21T21:00"), ...VIELLE_AURE)).toBeGreaterThan(-6);
    expect(sunAltitude(local("2026-08-21T21:30"), ...VIELLE_AURE)).toBeLessThan(-6);
    expect(sunAltitude(local("2026-08-22T03:00"), ...VIELLE_AURE)).toBeLessThan(-20);
  });
});

// The fixture's track, started on the Friday evening: the light fails mid-race.
const evening = (start) => ({
  ...report,
  totals: { ...report.totals, epoch_s_start_actual: start },
  track: report.track.map((point) => ({ ...point, latitude: 42.83, longitude: 0.33 })),
});

describe("nightSpans", () => {
  it("is empty for a race run in daylight", () => {
    expect(nightSpans(evening(local("2026-08-21T12:00")))).toEqual([]);
  });

  it("places the dark on the plan through the track, and lasts to the end", () => {
    // Started 21:00 for 2800 s: dark from about 21:20 to the finish at 21:46.
    const [span, ...rest] = nightSpans(evening(local("2026-08-21T21:00")));
    expect(rest).toEqual([]);
    expect(span.start_s).toBeGreaterThan(600);
    expect(span.start_s).toBeLessThan(1800);
    expect(span.end_s).toBe(2800);
    expect(span.end_m).toBe(3500);
    expect(span.start_m).toBeGreaterThan(0);
  });
});

describe("dayNightRatios", () => {
  it("splits actual over planned time at the dusk", () => {
    // Dark from race second 1500 on: the profile's last two steps, 3000-3500 m among them.
    const spans = [{ start_s: 1500, end_s: 2800, start_m: 2000, end_m: 3500 }];
    const { night, day } = dayNightRatios(report, spans);
    // By day 0-2000 m: 1500 s against 1500. By night 2000-3500 m, less the detour's step
    // (2200-2600 m lies inside 2000-3000), so 3000-3500: 400 s against 300.
    expect(day).toBeCloseTo(1);
    expect(night).toBeCloseTo(400 / 300);
  });

  it("is null for a part with no time", () => {
    expect(dayNightRatios(report, [])).toEqual({ night: null, day: expect.any(Number) });
  });
});
