import { modelText } from "./modelText.js";

it("writes a model as one line", () => {
  const settings = { pace_base_s_per_km: 500, fatigue_coefficient: 0.002, life_base_stop_s: 5400 };
  expect(modelText(settings)).toBe("8:20/km flat · fatigue 0.002 · 1h30 at each LifeBase");
  expect(modelText({ ...settings, life_base_stop_s: 0 })).toMatch(/no stop at LifeBases$/);
  expect(modelText(null)).toBeNull();
});
