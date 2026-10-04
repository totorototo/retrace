import { report } from "./report.fixture.js";
import { takeaways } from "./takeaways.js";

describe("takeaways", () => {
  it("gathers each answer from the section that tells it", () => {
    const { time, terrain, fade, night, next } = takeaways(report);
    // The time budget's totals: moving +600 s, stops -200 s (400 taken where 600 was planned).
    expect(time).toEqual({ moving_s: 600, stop_s: -200 });
    // The second climb holds the detour, so only the first counts: 60 s gained.
    expect(terrain).toEqual({ climbs_s: -60, descents_s: 60 });
    expect(fade).toMatchObject({ first: 1.5, second: 1.25, slowest: { to: "Aid" } });
    // Started at the epoch, on the 1st of January: all of it in the dark, so no comparison.
    expect(night).toBeNull();
    expect(next).toBeNull();
  });

  it("adds the steps up to the delta: down, up, the rest of the moving, the stops", () => {
    const { steps } = takeaways(report);
    expect(steps.steps.map(({ key, seconds, start }) => [key, seconds, start])).toEqual([
      ["down", 60, 0],
      ["up", -60, 60],
      ["rest", 600, 0],
      ["stops", -180, 600],
    ]);
    // The delta at the finish, 400 s, in whole minutes as shown: the stops' -200 s rounds to
    // -3 min, and the rest takes the difference, so the steps add up to the 7 min shown.
    expect(steps.total_s).toBe(420);
    expect(steps.steps.reduce((sum, step) => sum + step.seconds, 0)).toBe(420);
  });

  it("leaves out what the report can't answer", () => {
    const bare = { ...report, descents: undefined, sections: [], checkpoints: report.checkpoints };
    const { time, terrain, fade, steps } = takeaways(bare);
    expect(steps).toBeNull();
    expect(time).toBeNull();
    expect(terrain).toBeNull();
    expect(fade).toBeNull();
  });
});
