import { report } from "../story/report.fixture.js";
import { bounds, checkpointPositions, trackGeoJSON, trackRuns } from "./raceGeometry.js";

it("cuts the track into runs that share their joints", () => {
  const runs = trackRuns(report.track);
  expect(runs.map((run) => [run.on_route, run.coordinates.length])).toEqual([
    [true, 3],
    [false, 3],
    [true, 3],
  ]);
  expect(runs[1].coordinates[0]).toEqual(runs[0].coordinates.at(-1));
  expect(runs[2].coordinates[0]).toEqual(runs[1].coordinates.at(-1));
  expect(trackGeoJSON(report.track).features[1].properties).toEqual({ on_route: false });
});

it("drops a run too short to draw", () => {
  const track = [{ ...report.track[0], on_route: false }, ...report.track.slice(1, 3)];
  // The lone off-route point starts the line, then the on-route run takes it as its joint.
  expect(trackRuns(track).map((run) => run.on_route)).toEqual([true]);
});

it("places checkpoints on the plan by distance", () => {
  // The aid at 1500 m is halfway between two profile points: the later one wins the tie.
  expect(checkpointPositions(report).map((checkpoint) => checkpoint.latitude)).toEqual([
    45, 45.02, 45.035,
  ]);
});

it("bounds every coordinate", () => {
  expect(
    bounds([
      [6, 45],
      [6.2, 44.9],
      [5.9, 45.1],
    ]),
  ).toEqual([
    [5.9, 44.9],
    [6.2, 45.1],
  ]);
});
