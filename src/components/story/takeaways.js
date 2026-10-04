// The story's answers, gathered for the hero: one figure per question a reader asks first,
// each from the section that shows it in full. Pure, as debrief.js: the hero writes the
// sentences, as every section writes its own lede.

import { climbHalves, deviationSpans, paceHalves, sectionSpans, timeBudget } from "./debrief.js";
import { dayNightRatios, nightSpans } from "./night.js";

const sum = ([first, second]) => first + second;

/**
 * Null for a question the report can't answer (no descents, no night, no calibration), so
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

  // The night, when the race had both.
  const light = dayNightRatios(report, nightSpans(report));
  const night = light.night != null && light.day != null ? light : null;

  return { time, terrain, fade, night, next: report.calibration ?? null };
}
