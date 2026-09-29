// What the story charts read, derived from debriefz's report. Pure: the charts stay thin
// and the arithmetic is tested on its own. Seconds and meters, as in the report.

/** Positive delta is behind the plan; under 30 s reads as on it. */
export const toneOf = (deltaS) =>
  deltaS == null || Math.abs(deltaS) < 30 ? undefined : deltaS > 0 ? "behind" : "ahead";

/**
 * The gap curve: race time behind the plan (positive) or ahead of it (negative), per km.
 * Starts at the first checkpoint and stops where the actual times do.
 */
export function gapSeries(report) {
  const point = (distance_m, planned, actual) => ({
    distance_m,
    duration_s_planned: planned,
    duration_s_actual: actual,
    delta_s: actual - planned,
  });
  const points = [point(0, 0, 0)];
  for (const split of report.splits) {
    if (split.duration_s_actual == null) break;
    points.push(point(split.distance_m, split.duration_s_planned, split.duration_s_actual));
  }
  // The splits stop at the last whole km; the finish is a checkpoint.
  const finish = report.checkpoints.at(-1);
  if (finish?.duration_s_actual != null && finish.distance_m > points.at(-1).distance_m) {
    points.push(point(finish.distance_m, finish.duration_s_planned, finish.duration_s_actual));
  }
  return points;
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
