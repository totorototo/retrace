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
 *
 * Off the planned trace, the time a planned km was "first reached" is the time the runner
 * came back to the trace: every point of a detour gets the rejoin time, and the curve would
 * jump at the start of it and slide down across it. So those points are `off_trace`, and
 * their gap is bridged in a straight line between the points either side: the two ends are
 * known, the way between them is not.
 */
export function gapSeries(report) {
  const points = [];
  for (const point of report.profile) {
    if (point.duration_s_actual == null) break;
    points.push({
      ...point,
      delta_s: point.duration_s_actual - point.duration_s_planned,
      off_trace: false,
    });
  }
  for (const span of deviationSpans(report)) bridge(points, span);
  return points;
}

function bridge(points, span) {
  const inside = (point) => point.distance_m > span.start_m && point.distance_m < span.end_m;
  const before = points.findLast((point) => point.distance_m <= span.start_m);
  const after = points.find((point) => point.distance_m >= span.end_m);
  for (const point of points) {
    if (!inside(point)) continue;
    point.off_trace = true;
    // Never rejoined (the curve ends in the detour): nothing to bridge to.
    if (!before || !after) continue;
    const fraction =
      (point.distance_m - before.distance_m) / (after.distance_m - before.distance_m);
    point.delta_s = before.delta_s + fraction * (after.delta_s - before.delta_s);
  }
}

/** Whether `distance_m` along the plan lies inside a stretch run off the trace. */
export const isOffTrace = (spans, distance_m) =>
  spans.some((span) => distance_m > span.start_m && distance_m < span.end_m);

/** The runs of off-trace points, with the on-trace point either side: the bridges to draw. */
export function bridges(points) {
  const found = [];
  for (let i = 0; i < points.length; i++) {
    if (!points[i].off_trace) continue;
    let j = i;
    while (j + 1 < points.length && points[j + 1].off_trace) j++;
    if (i > 0 && j + 1 < points.length) found.push({ from: points[i - 1], to: points[j + 1] });
    i = j;
  }
  return found;
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
    rows.push({
      from: section.from,
      to: section.to,
      start_m: report.checkpoints[index].distance_m,
      end_m: report.checkpoints[index + 1].distance_m,
      moving_s,
      stop_s,
      total_s: moving_s + stop_s,
    });
  });
  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  return { rows, moving_s: sum("moving_s"), stop_s: sum("stop_s"), total_s: sum("total_s") };
}

/**
 * Tick values for a time axis from `min_s` to `max_s` (seconds): every hour, or every half
 * hour or quarter when the range is short, so there are a handful of lines, never dozens.
 */
export function timeTicks(min_s, max_s) {
  const range = max_s - min_s;
  const step = [900, 1800, 3600, 7200].find((candidate) => range / candidate <= 6) ?? 14400;
  const ticks = [];
  for (let tick = Math.ceil(min_s / step) * step + 0; tick <= max_s; tick += step) ticks.push(tick);
  return ticks;
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
 * Stages placed along the route, from the checkpoint opening their first section to the one
 * closing their last (debriefz's section indices). Empty for a report without stages.
 */
export function stageSpans(report) {
  return (report.stages ?? []).map((stage) => ({
    ...stage,
    start_m: report.checkpoints[stage.section_index_first].distance_m,
    end_m: report.checkpoints[stage.section_index_end].distance_m,
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

/** The climb under `distance_m` along the plan, or null. */
export const climbAt = (climbs, distance_m) =>
  climbs.find(
    (climb) =>
      distance_m >= climb.distance_m_start &&
      distance_m <= climb.distance_m_start + climb.distance_m,
  ) ?? null;

/** Whether a climb or descent overlaps a stretch run off the planned trace. */
export const overlapsOffTrace = (spans, slope) =>
  spans.some(
    (span) =>
      span.start_m < slope.distance_m_start + slope.distance_m &&
      span.end_m > slope.distance_m_start,
  );

/**
 * Time lost (positive) or gained on the climbs, or the descents, in each half of the route
 * (one falls in the half its middle does). `plannedKey` is the field that is null outside the
 * plan: the climbs' VAM, or the descents' rate. Those outside the plan, not run, or run partly
 * off the trace (a detour's time isn't the planned ground's) count for nothing.
 */
export function climbHalves(
  climbs,
  distance_m,
  { plannedKey = "vam_m_per_h_planned", deviations = [] } = {},
) {
  const halves = [0, 0];
  for (const climb of climbs) {
    if (climb[plannedKey] == null || climb.duration_s_actual == null) continue;
    if (overlapsOffTrace(deviations, climb)) continue;
    const middle_m = climb.distance_m_start + climb.distance_m / 2;
    halves[middle_m < distance_m / 2 ? 0 : 1] += climb.duration_s_actual - climb.duration_s_planned;
  }
  return halves;
}

/**
 * How far each plan was from the race at every checkpoint reached: the original and the one
 * debriefz reran with the fitted settings and the actual stops. Signed, actual minus
 * predicted (positive: the race was slower than predicted), where debriefz's rms and max
 * count the size alone. Empty without a calibration.
 */
export function calibrationErrors(report) {
  const replanned = report.calibration?.duration_s_replanned;
  if (!replanned) return [];
  return report.checkpoints.flatMap((checkpoint, index) =>
    checkpoint.duration_s_actual == null
      ? []
      : [
          {
            name: checkpoint.name,
            distance_m: checkpoint.distance_m,
            planned_s: checkpoint.duration_s_actual - checkpoint.duration_s_planned,
            replanned_s: checkpoint.duration_s_actual - replanned[index],
          },
        ],
  );
}

const LIFE_BASE = "LifeBase";

/**
 * The average stop at the LifeBases and at the other checkpoints (start and finish aside),
 * of `key` (stop_s_planned or stop_s_actual): debriefz's split for the fitted stops. Null
 * for a kind with none.
 */
export function stopAverages(checkpoints, key) {
  const sums = { life_base: [0, 0], other: [0, 0] };
  for (const checkpoint of checkpoints.slice(1, -1)) {
    const stop_s = checkpoint[key];
    if (stop_s == null) continue;
    const sum = sums[checkpoint.type_name === LIFE_BASE ? "life_base" : "other"];
    sum[0] += stop_s;
    sum[1] += 1;
  }
  const average = ([total, count]) => (count > 0 ? total / count : null);
  return { life_base_s: average(sums.life_base), other_s: average(sums.other) };
}

// A step this many times slower than planned holds a stop no checkpoint accounts for (a
// pause on the trail): left out, as the checkpoints' stops are.
const STOP_RATIO = 4;

/**
 * The heart rate and the pace along the route, every profile point (100 m), each a rolling
 * ratio of sums over `radius_m` either side, per step: the heart rate weighted by time,
 * Σ(bpm × actual) / Σ actual; the pace against plan, Σ actual / Σ planned; and their
 * product, the beats spent per planned minute, Σ(bpm × actual) / Σ planned. The plan stands
 * in for a grade-adjusted pace: it's slower uphill, so a climb run to plan reads as a flat.
 * Steps holding a stop or a detour are left out (beats with no progress, or progress the plan
 * gave stop time for); the line goes on through a stop, and breaks inside a detour, where
 * nothing measured it. Over 10 km by default: a 100 m step's times are too coarse for less.
 * why: ratios of sums, not means of ratios: a step weighs its time, so a fast step's ratio
 * doesn't count as much as a crawl's, and cost = bpm × pace holds at every point.
 */
export function heartPaceSeries(report, radius_m = 5000) {
  const { profile } = report;
  const spans = deviationSpans(report);
  const stops = report.checkpoints
    .filter((checkpoint) => checkpoint.stop_s_planned > 0 || checkpoint.stop_s_actual > 0)
    .map((checkpoint) => checkpoint.distance_m);
  const terms = profile.map((point, index) => {
    const before = profile[index - 1];
    if (!before) return null;
    // The step's actual time holds the detour's, which the plan has no time for.
    if (spans.some((span) => span.start_m < point.distance_m && span.end_m > before.distance_m)) {
      return null;
    }
    const bpm = point.heart_rate_bpm_average;
    const planned = point.duration_s_planned - before.duration_s_planned;
    const actual = point.duration_s_actual - before.duration_s_actual;
    if (bpm == null || !(planned > 0) || !(actual > 0)) return null;
    if (actual > planned * STOP_RATIO) return null;
    // A checkpoint at either end: its stop may fall in this step.
    if (stops.some((at) => at >= before.distance_m && at <= point.distance_m)) return null;
    return [bpm * actual, actual, planned];
  });
  // A window sliding along the evenly spaced profile: sums in, sums out.
  let low = 0;
  let high = -1;
  let [beats, actual, planned, count] = [0, 0, 0, 0];
  const add = (term, sign) => {
    if (term == null) return;
    beats += sign * term[0];
    actual += sign * term[1];
    planned += sign * term[2];
    count += sign;
  };
  return profile.map((point, index) => {
    while (
      high + 1 < profile.length &&
      profile[high + 1].distance_m <= point.distance_m + radius_m
    ) {
      high += 1;
      add(terms[high], 1);
    }
    while (profile[low].distance_m < point.distance_m - radius_m) {
      add(terms[low], -1);
      low += 1;
    }
    const shown = index > 0 && !isOffTrace(spans, point.distance_m) && count > 0;
    return shown
      ? {
          distance_m: point.distance_m,
          bpm: beats / actual,
          pace: actual / planned,
          cost: beats / planned,
        }
      : { distance_m: point.distance_m, bpm: null, pace: null, cost: null };
  });
}

/**
 * Each half of the route (a section falls in the half its midpoint does), from the sections
 * with both a heart rate and an actual moving time: the heart rate (weighted by moving time),
 * the pace against plan, and their product, the beats spent per planned minute. A half with
 * none is null.
 * why: cost = bpm × pace exactly, so the drift splits into its two causes, which the lede
 * names.
 */
export function heartHalves(spans, distance_m) {
  const halves = [
    { beats: 0, actual: 0, planned: 0 },
    { beats: 0, actual: 0, planned: 0 },
  ];
  for (const span of spans) {
    if (span.heart_rate_bpm_average == null || span.moving_s_actual == null) continue;
    const half = halves[(span.start_m + span.end_m) / 2 < distance_m / 2 ? 0 : 1];
    half.beats += span.heart_rate_bpm_average * span.moving_s_actual;
    half.actual += span.moving_s_actual;
    half.planned += span.moving_s_planned;
  }
  return halves.map((half) =>
    half.planned > 0 && half.actual > 0
      ? {
          bpm: half.beats / half.actual,
          pace: half.actual / half.planned,
          cost: half.beats / half.planned,
        }
      : null,
  );
}

// Within this share either way, the heart rate or the pace held.
const HELD = 0.05;

/**
 * What the second half did against the first, on the heart rate and the pace: the four ways
 * a long race fades. Null without both halves.
 * - drift: the heart rate rose, the pace held (heat, dehydration);
 * - overreach: the heart rate rose and the pace slowed;
 * - legs: the heart rate fell and the pace slowed (the muscles, or the brain, held back);
 * - efficient: the heart rate fell, the pace held;
 * - steady: both held.
 */
export function heartQuadrant(first, second) {
  if (!first || !second) return null;
  const heart = second.bpm / first.bpm - 1;
  const pace = second.pace / first.pace - 1;
  if (Math.abs(heart) < HELD && Math.abs(pace) < HELD) return "steady";
  if (heart >= 0) return pace >= HELD ? "overreach" : "drift";
  return pace >= HELD ? "legs" : "efficient";
}

// What the second half did against the first, in words: the heart section's lede and the
// story in short.
export const HEART_VERDICTS = {
  drift: "the heart drifting",
  overreach: "overreaching",
  legs: "the legs tiring, not the heart",
  efficient: "more efficient",
};
