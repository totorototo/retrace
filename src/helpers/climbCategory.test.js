import { getClimbCategory } from "./climbCategory.js";

const climb = (distance_m, gradient_percent_average) => ({ distance_m, gradient_percent_average });

it("returns null below the Cat 4 threshold", () => {
  // 1000 m × 5 % = 5000 < 8000
  expect(getClimbCategory(climb(1000, 5))).toBeNull();
});

it("categorizes climbs at each threshold", () => {
  const keys = [1000, 2000, 4000, 8000, 10_000].map((m) => getClimbCategory(climb(m, 8)).key);
  expect(keys).toEqual(["4", "3", "2", "1", "HC"]);
});
