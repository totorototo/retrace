import {
  behindFrom,
  bridges,
  calibrationErrors,
  climbAt,
  climbHalves,
  deviationSpans,
  gapSeries,
  isOffTrace,
  paceHalves,
  profileAt,
  sectionSpans,
  spacedNames,
  stageSpans,
  stopAverages,
  timeBudget,
  timeTicks,
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

describe("off the planned trace", () => {
  // A point inside the 2200–2600 m detour, "first reached" only at the rejoin (2150 s).
  const detour = {
    ...report,
    profile: [
      ...report.profile.slice(0, 3),
      { ...report.profile[2], distance_m: 2400, duration_s_planned: 1800, duration_s_actual: 2150 },
      ...report.profile.slice(3),
    ],
  };

  it("bridges the gap between the points either side", () => {
    const point = gapSeries(detour)[3];
    // Straight from 0 s at 2000 m to +300 s at 3000 m: +120 s at 2400 m, not the frozen +350.
    expect(point).toMatchObject({ distance_m: 2400, off_trace: true, delta_s: 120 });
    expect(gapSeries(detour).filter((p) => p.off_trace)).toHaveLength(1);
  });

  it("has one bridge per detour, from and to points on the trace", () => {
    const [bridge, ...others] = bridges(gapSeries(detour));
    expect(others).toHaveLength(0);
    expect([bridge.from.distance_m, bridge.to.distance_m]).toEqual([2000, 3000]);
  });

  it("leaves a detour never rejoined unbridged", () => {
    const open = { ...detour.deviations[0], distance_m_rejoined: null };
    const unfinished = {
      ...detour,
      deviations: [open],
      totals: { ...detour.totals, distance_m_reached: 2600 },
      profile: detour.profile.map((p) =>
        p.distance_m > 2400 ? { ...p, duration_s_actual: null } : p,
      ),
    };
    const points = gapSeries(unfinished);
    expect(points.at(-1)).toMatchObject({ distance_m: 2400, off_trace: true, delta_s: 350 });
    expect(bridges(points)).toEqual([]);
  });

  it("tells a distance inside a detour", () => {
    const spans = deviationSpans(report);
    expect([2200, 2400, 2600, 3000].map((d) => isOffTrace(spans, d))).toEqual([
      false,
      true,
      false,
      false,
    ]);
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

  it("places each row between its checkpoints", () => {
    expect(timeBudget(report).rows[1]).toMatchObject({ start_m: 1500, end_m: 3500 });
  });

  it("adds up to the delta at the finish", () => {
    expect(timeBudget(report).total_s).toBe(report.checkpoints.at(-1).delta_s);
  });
});

describe("timeTicks", () => {
  it("steps by the hour over a long range", () => {
    expect(timeTicks(-3000, 18000)).toEqual([0, 3600, 7200, 10800, 14400, 18000]);
  });

  it("steps finer over a short one", () => {
    expect(timeTicks(-600, 1500)).toEqual([0, 900]);
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

it("finds the climb under a distance", () => {
  expect(climbAt(report.climbs, 500)).toBe(report.climbs[0]);
  expect(climbAt(report.climbs, 1500)).toBeNull();
  expect(climbAt(report.climbs, 3000)).toBe(report.climbs[1]);
});

it("sums the time lost or gained on the climbs in each half", () => {
  const [first, second] = climbHalves(report.climbs, 3500);
  expect(first).toBe(340 - 400);
  expect(second).toBe(900 - 600);
  const unplanned = report.climbs.map((c) => ({ ...c, vam_m_per_h_planned: null }));
  expect(climbHalves(unplanned, 3500)).toEqual([0, 0]);
});

describe("calibrationErrors", () => {
  it("is empty without a calibration", () => {
    expect(calibrationErrors(report)).toEqual([]);
  });

  it("signs each plan's miss at every checkpoint reached", () => {
    const calibrated = {
      ...report,
      calibration: { duration_s_replanned: [0, 800, 2900] },
      checkpoints: report.checkpoints.map((checkpoint, index) =>
        index === 2 ? { ...checkpoint, duration_s_actual: null } : checkpoint,
      ),
    };
    expect(calibrationErrors(calibrated)).toEqual([
      { name: "Start", distance_m: 0, planned_s: 0, replanned_s: 0 },
      { name: "Aid", distance_m: 1500, planned_s: 300, replanned_s: 100 },
    ]);
  });
});

describe("stopAverages", () => {
  const checkpoints = [
    { type_name: "Start", stop_s_planned: 999 },
    { type_name: "LifeBase", stop_s_planned: 3600 },
    { type_name: "TimeBarrier", stop_s_planned: 0 },
    { type_name: "LifeBase", stop_s_planned: 1800 },
    { type_name: null, stop_s_planned: 600 },
    { type_name: "Arrival", stop_s_planned: 999 },
  ];

  it("splits LifeBases from the rest, start and finish aside", () => {
    expect(stopAverages(checkpoints, "stop_s_planned")).toEqual({
      life_base_s: 2700,
      other_s: 300,
    });
  });

  it("is null for a kind with no stop", () => {
    const none = checkpoints.map((checkpoint) => ({ ...checkpoint, stop_s_planned: null }));
    expect(stopAverages(none, "stop_s_planned")).toEqual({ life_base_s: null, other_s: null });
  });
});

describe("stageSpans", () => {
  it("places each stage between the checkpoints its sections start and end at", () => {
    const [stage] = stageSpans(report);
    expect(stage).toMatchObject({ from: "Start", to: "Finish", start_m: 0, end_m: 3500 });
  });

  it("is empty for a report without stages", () => {
    expect(stageSpans({ ...report, stages: undefined })).toEqual([]);
  });
});
