import { report } from "../story/report.fixture.js";
import {
  defaultSpeed,
  plannedDistanceAt,
  plannedDurationAt,
  plannedTimeline,
  replayAt,
  replayDuration,
  routePointAt,
  trackPointAt,
} from "./replay.js";

const timeline = plannedTimeline(report);

describe("plannedTimeline", () => {
  it("holds the plan's runner at the aid station for its planned stop", () => {
    expect(timeline.filter((knot) => knot.distance_m === 1500)).toEqual([
      { distance_m: 1500, duration_s: 600 },
      { distance_m: 1500, duration_s: 1200 },
    ]);
    expect(plannedDistanceAt(timeline, 900)).toBe(1500);
  });

  it("never runs the clock backwards", () => {
    const skewed = {
      ...report,
      checkpoints: [{ distance_m: 1000, duration_s_planned: 450, stop_s_planned: 60 }],
    };
    const times = plannedTimeline(skewed).map((knot) => knot.duration_s);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

it("reads the plan's clock both ways, clamped to the route", () => {
  expect(plannedDistanceAt(timeline, 200)).toBe(500);
  expect(plannedDistanceAt(timeline, 1350)).toBe(1750);
  expect(plannedDistanceAt(timeline, -5)).toBe(0);
  expect(plannedDistanceAt(timeline, 9999)).toBe(3500);
  expect(plannedDurationAt(timeline, 500)).toBe(200);
  // At a planned stop, the arrival.
  expect(plannedDurationAt(timeline, 1500)).toBe(600);
  expect(plannedDurationAt(timeline, 5000)).toBe(2400);
});

it("places a distance between the profile's points", () => {
  expect(routePointAt(report.profile, 500).latitude).toBeCloseTo(45.005);
  expect(routePointAt(report.profile, 9999).latitude).toBeCloseTo(45.035);
});

describe("trackPointAt", () => {
  it("interpolates between track points, and waits at either end", () => {
    const point = trackPointAt(report.track, 350);
    expect(point.latitude).toBeCloseTo(45.005);
    expect(point.distance_m).toBe(500);
    expect(trackPointAt(report.track, -10).distance_m).toBe(0);
    expect(trackPointAt(report.track, 9999).distance_m).toBe(3500);
  });

  it("keeps the last progress known along the plan off the trace", () => {
    const track = report.track.map((point) =>
      point.on_route ? point : { ...point, distance_m: null },
    );
    const point = trackPointAt(track, 1800);
    expect(point.on_route).toBe(false);
    expect(point.distance_m).toBe(2000);
  });
});

it("replays both runners and the gap between them", () => {
  // Arriving at the aid station while the plan's runner is still stopped there.
  const at = replayAt(report, timeline, 1150);
  expect(at.actual.distance_m).toBe(1500);
  expect(at.planned.distance_m).toBe(1500);
  expect(at.gap_m).toBe(0);
  expect(at.delta_s).toBe(550);
  // After the finish, the gap is the final one.
  expect(replayAt(report, timeline, 3000).delta_s).toBe(400);
  expect(replayDuration(report, timeline)).toBe(2800);
});

it("picks a speed that fits the race in about a minute", () => {
  expect(defaultSpeed(2800)).toBe(60);
  expect(defaultSpeed(100_000)).toBe(1200);
  expect(defaultSpeed(1e7)).toBe(2400);
});
