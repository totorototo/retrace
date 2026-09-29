import {
  behindFrom,
  gapSeries,
  paceHalves,
  sectionSpans,
  spacedNames,
  timeBudget,
  toneOf,
} from "./debrief.js";
import { report } from "./report.fixture.js";

describe("gapSeries", () => {
  it("runs from the start through each split to the finish", () => {
    const points = gapSeries(report);
    expect(points.map((point) => point.distance_m)).toEqual([0, 1000, 2000, 3000, 3500]);
    expect(points.map((point) => point.delta_s)).toEqual([0, -60, 0, 300, 400]);
  });

  it("stops where the actual times do", () => {
    const unfinished = {
      ...report,
      splits: [...report.splits.slice(0, 2), { ...report.splits[2], duration_s_actual: null }],
      checkpoints: report.checkpoints.map((checkpoint, index) =>
        index === 2 ? { ...checkpoint, duration_s_actual: null, delta_s: null } : checkpoint,
      ),
    };
    expect(gapSeries(unfinished).at(-1).distance_m).toBe(2000);
  });
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
