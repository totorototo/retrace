// The story's answers, gathered for the hero: one figure per question a reader asks first,
// each from the section that shows it in full. Pure, as debrief.js: the hero writes the
// sentences, as every section writes its own lede.

import {
  climbHalves,
  deviationSpans,
  heartHalves,
  heartQuadrant,
  paceHalves,
  sectionSpans,
  timeBudget,
} from "./debrief.js";
import { dayNightRatios, nightSpans } from "./night.js";

const sum = ([first, second]) => first + second;

/**
 * Null for a question the report can't answer (no descents, no heart rate, no night, no
 * calibration), so
 * the hero leaves its line out rather than print a dash.
 */
export function takeaways(report) {
  const distance_m = report.totals.distance_m_planned;
  const deviations = deviationSpans(report);

  // Where the time went: moving slower than planned, against stopping longer.
  const budget = timeBudget(report);
  const time = budget.rows.length ? { moving_s: budget.moving_s, stop_s: budget.stop_s } : null;

  // The terrain: the climbs against the descents, detours left out as their section does.
  const climbs_s = sum(climbHalves(report.climbs, distance_m, { deviations }));
  const descents = report.descents ?? [];
  const terrain = descents.length
    ? {
        climbs_s,
        descents_s: sum(
          climbHalves(descents, distance_m, { plannedKey: "descent_m_per_h_planned", deviations }),
        ),
      }
    : null;

  // The fade: the pace by half, and the slowest section.
  const spans = sectionSpans(report);
  const [first, second] = paceHalves(spans, distance_m);
  const slowest = spans.reduce(
    (best, span) => ((span.pace_ratio ?? 0) > (best?.pace_ratio ?? 0) ? span : best),
    null,
  );
  const fade = first != null && second != null ? { first, second, slowest } : null;

  // The heart against the pace, by half: which way the race faded.
  const [heartFirst, heartSecond] = heartHalves(spans, distance_m);
  const quadrant = heartQuadrant(heartFirst, heartSecond);
  const heart = quadrant ? { first: heartFirst, second: heartSecond, quadrant } : null;

  // The night, when the race had both.
  const light = dayNightRatios(report, nightSpans(report));
  const night = light.night != null && light.day != null ? light : null;

  return {
    time,
    terrain,
    steps: waterfall(time, terrain),
    fade,
    heart,
    night,
    next: report.calibration ?? null,
  };
}

/**
 * Where the delta came from, step by step: going down, going up, the rest of the moving, the
 * stops. The steps add up to the time budget's total, the delta at the last checkpoint
 * reached: "the rest" is the moving time off the climbs and descents, which takes in the
 * flats and the detours the climbs and descents leave out. Without descents, moving and
 * stops alone. In whole minutes. Null without a time budget.
 */
function waterfall(time, terrain) {
  if (!time) return null;
  const steps = terrain
    ? [
        { key: "down", label: "going down", seconds: terrain.descents_s, id: "climbs" },
        { key: "up", label: "going up", seconds: terrain.climbs_s, id: "climbs" },
        {
          key: "rest",
          label: "the rest",
          seconds: time.moving_s - terrain.descents_s - terrain.climbs_s,
          id: "pace",
        },
      ]
    : [{ key: "moving", label: "moving", seconds: time.moving_s, id: "pace" }];
  steps.push({ key: "stops", label: "stops", seconds: time.stop_s, id: "budget" });
  // Whole minutes, as they're shown, with the rest (or the moving) taking the rounding: the
  // figures on screen add up to the total on screen, which minutes rounded one by one don't.
  const minute = (seconds) => Math.round(seconds / 60) * 60;
  const total = minute(time.moving_s + time.stop_s);
  const absorber = steps.find((step) => step.key === "rest" || step.key === "moving");
  for (const step of steps) if (step !== absorber) step.seconds = minute(step.seconds);
  absorber.seconds =
    total - steps.reduce((sum, step) => (step === absorber ? sum : sum + step.seconds), 0);
  let start = 0;
  for (const step of steps) {
    step.start = start;
    start += step.seconds;
  }
  return { steps, total_s: start };
}
