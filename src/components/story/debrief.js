// What the story charts read, derived from debriefz's report. Pure: the charts stay thin
// and the arithmetic is tested on its own. Seconds and meters, as in the report.

/** Positive delta is behind the plan; under 30 s reads as on it. */
export const toneOf = (deltaS) =>
  deltaS == null || Math.abs(deltaS) < 30 ? undefined : deltaS > 0 ? "behind" : "ahead";

/** A pace ratio (actual over planned moving time) within 5 % of 1 reads as on plan. */
export const toneOfRatio = (ratio) =>
  ratio == null || Math.abs(ratio - 1) < 0.05 ? undefined : ratio > 1 ? "behind" : "ahead";

/**
 * The gap curve: race time behind the plan (positive) or ahead of it (negative), every
 * profile point (100 m). Stops where the actual times do.
 */
export function gapSeries(report) {
  const points = [];
  for (const point of report.profile) {
    if (point.duration_s_actual == null) break;
    points.push({ ...point, delta_s: point.duration_s_actual - point.duration_s_planned });
  }
  return points;
}

/** The profile point nearest `distance_m`: the profile is evenly spaced, save its end. */
export function profileAt(profile, distance_m) {
  let low = 0;
  let high = profile.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (profile[middle].distance_m < distance_m) low = middle + 1;
    else high = middle;
  }
  const before = profile[Math.max(0, low - 1)];
  const after = profile[low];
  return distance_m - before.distance_m < after.distance_m - distance_m ? before : after;
}

/**
 * The stretches run off the planned trace, placed on it. One left before the first
 * checkpoint starts at 0; one never rejoined ends where the runner got to.
 */
export function deviationSpans(report) {
  return report.deviations.map((deviation) => ({
    ...deviation,
    start_m: deviation.distance_m_left ?? 0,
    end_m: deviation.distance_m_rejoined ?? report.totals.distance_m_reached,
  }));
}

/**
 * Where the runner fell behind for good: the last point on or ahead of the plan, when the
 * curve ends behind it. Null when it ends ahead.
 */
export function behindFrom(points) {
  if (!(points.at(-1)?.delta_s > 0)) return null;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].delta_s <= 0) return points[i];
  }
  return points[0];
}

/**
 * Each section's share of the final delta, split into moving slower (or faster) than
 * planned and stopping longer (or shorter). Over a section, the delta grows by
 *   (moving actual − moving planned) + (stopped actual − stop planned at its start),
 * so the rows add up to the delta at the last checkpoint reached.
 */
export function timeBudget(report) {
  const rows = [];
  report.sections.forEach((section, index) => {
    if (section.moving_s_actual == null) return;
    const stopPlanned = report.checkpoints[index]?.stop_s_planned ?? 0;
    const moving_s = section.moving_s_actual - section.moving_s_planned;
    const stop_s = (section.stopped_s_actual ?? 0) - stopPlanned;
    rows.push({ from: section.from, to: section.to, moving_s, stop_s, total_s: moving_s + stop_s });
  });
  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  return { rows, moving_s: sum("moving_s"), stop_s: sum("stop_s"), total_s: sum("total_s") };
}

/** Sections placed along the route, between the checkpoints they join. */
export function sectionSpans(report) {
  return report.sections.map((section, index) => ({
    ...section,
    start_m: report.checkpoints[index].distance_m,
    end_m: report.checkpoints[index + 1].distance_m,
  }));
}

/**
 * Checkpoint names under a chart, at `pct` percent across it: truncated, and dropping any
 * that would overlap the previous one kept (as Terminus's ElevationProfile does).
 */
export function spacedNames(markers, minGapPct = 18, maxLength = 12) {
  let last = -Infinity;
  return markers
    .filter((marker) => {
      if (marker.pct - last < minGapPct) return false;
      last = marker.pct;
      return true;
    })
    .map((marker) => ({
      ...marker,
      name: marker.name.length > maxLength ? `${marker.name.slice(0, maxLength)}…` : marker.name,
    }));
}

/**
 * Actual over planned moving time for each half of the route (a section falls in the half
 * its midpoint does): how much the pace faded. A half with no actual times is null.
 */
export function paceHalves(spans, distance_m) {
  const halves = [
    { planned: 0, actual: 0 },
    { planned: 0, actual: 0 },
  ];
  for (const span of spans) {
    if (span.moving_s_actual == null) continue;
    const half = halves[(span.start_m + span.end_m) / 2 < distance_m / 2 ? 0 : 1];
    half.planned += span.moving_s_planned;
    half.actual += span.moving_s_actual;
  }
  return halves.map((half) => (half.planned > 0 ? half.actual / half.planned : null));
}
