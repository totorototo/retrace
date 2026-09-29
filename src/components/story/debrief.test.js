import {
  behindFrom,
  deviationSpans,
  gapSeries,
  paceHalves,
  profileAt,
  sectionSpans,
  spacedNames,
  timeBudget,
  toneOf,
  toneOfRatio,
} from "./debrief.js";
import { report } from "./report.fixture.js";

describe("gapSeries", () => {
  it("runs along the profile to the finish", () => {
    const points = gapSeries(report);
    expect(points.map((point) => point.distance_m)).toEqual([0, 1000, 2000, 3000, 3500]);
    expect(points.map((point) => point.delta_s)).toEqual([0, -60, 0, 300, 400]);
  });

  it("stops where the actual times do", () => {
    const profile = report.profile.map((point, index) =>
      index >= 3 ? { ...point, duration_s_actual: null } : point,
    );
    expect(gapSeries({ ...report, profile }).at(-1).distance_m).toBe(2000);
  });
});

it("finds the nearest profile point", () => {
  const at = (distance_m) => profileAt(report.profile, distance_m).distance_m;
  expect([at(-5), at(400), at(600), at(3200), at(3300), at(9000)]).toEqual([
    0, 0, 1000, 3000, 3500, 3500,
  ]);
});

it("places the deviations on the plan, open ends included", () => {
  const open = { ...report.deviations[0], distance_m_left: null, distance_m_rejoined: null };
  const spans = deviationSpans({ ...report, deviations: [report.deviations[0], open] });
  expect(spans.map((span) => [span.start_m, span.end_m])).toEqual([
    [2200, 2600],
    [0, 3500],
  ]);
});

describe("behindFrom", () => {
  it("is the last point on or ahead of the plan", () => {
    expect(behindFrom(gapSeries(report)).distance_m).toBe(2000);
  });

  it("is null when the curve ends ahead", () => {
    expect(behindFrom([{ delta_s: 0 }, { delta_s: 120 }, { delta_s: -30 }])).toBeNull();
  });
});

describe("timeBudget", () => {
  it("splits each section's delta into moving and stopping", () => {
    const { rows } = timeBudget(report);
    // Section 2: 300 s slower moving; stopped 400 s where 600 s were planned at the aid.
    expect(rows[1]).toMatchObject({ moving_s: 300, stop_s: -200, total_s: 100 });
  });

  it("adds up to the delta at the finish", () => {
    expect(timeBudget(report).total_s).toBe(report.checkpoints.at(-1).delta_s);
  });
});

it("places sections between their checkpoints", () => {
  expect(sectionSpans(report).map((span) => [span.start_m, span.end_m])).toEqual([
    [0, 1500],
    [1500, 3500],
  ]);
});

it("compares the pace of each half", () => {
  const [first, second] = paceHalves(sectionSpans(report), 3500);
  expect(first).toBeCloseTo(1.5);
  expect(second).toBeCloseTo(1.25);
});

it("spaces and truncates names", () => {
  const names = spacedNames(
    [10, 20, 30, 90].map((pct) => ({ pct, name: pct === 90 ? "Restaurant Merlans" : "Aid" })),
  );
  expect(names.map((name) => name.pct)).toEqual([10, 30, 90]);
  expect(names.at(-1).name).toBe("Restaurant M…");
});

it("reads under 30 s as on plan", () => {
  expect([toneOf(null), toneOf(29), toneOf(-31), toneOf(31)]).toEqual([
    undefined,
    undefined,
    "ahead",
    "behind",
  ]);
});

it("reads a pace ratio within 5 % of 1 as on plan", () => {
  expect([toneOfRatio(null), toneOfRatio(1.04), toneOfRatio(0.9), toneOfRatio(1.2)]).toEqual([
    undefined,
    undefined,
    "ahead",
    "behind",
  ]);
});
