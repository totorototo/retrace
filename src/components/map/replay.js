// The race replayed against the plan: where the runner was, and where the plan had them,
// at each second of race time. Pure, as raceGeometry.js: the map only places the results.

/**
 * The plan's clock along the route: { distance_m, duration_s } knots, distance and time
 * both non-decreasing. The profile gives the planned time every 100 m, a checkpoint's stop
 * spread over the 100 m after it; the checkpoints' arrivals and departures put each stop
 * back in place, so the plan's runner waits at the aid station as it was planned to.
 */
export function plannedTimeline(report) {
  const knots = report.profile.map((point) => ({
    distance_m: point.distance_m,
    duration_s: point.duration_s_planned,
  }));
  for (const checkpoint of report.checkpoints) {
    if (!(checkpoint.stop_s_planned > 0)) continue;
    const arrival = {
      distance_m: checkpoint.distance_m,
      duration_s: checkpoint.duration_s_planned,
    };
    const departure = { ...arrival, duration_s: arrival.duration_s + checkpoint.stop_s_planned };
    knots.push(arrival, departure);
  }
  knots.sort((a, b) => a.distance_m - b.distance_m || a.duration_s - b.duration_s);
  // A knot of the profile that disagrees with a checkpoint by rounding would run the clock
  // backwards: keep the time from ever going down.
  let latest = 0;
  for (const knot of knots) {
    latest = Math.max(latest, knot.duration_s);
    knot.duration_s = latest;
  }
  return knots;
}

/** Index of the first item whose `key` is at least `value`, or the length. */
function lowerBound(items, key, value) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (items[middle][key] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

const lerp = (a, b, fraction) => a + (b - a) * fraction;

/** How far along the route the plan had the runner at `duration_s`. */
export function plannedDistanceAt(timeline, duration_s) {
  const index = lowerBound(timeline, "duration_s", duration_s);
  if (index === 0) return timeline[0].distance_m;
  if (index === timeline.length) return timeline.at(-1).distance_m;
  const before = timeline[index - 1];
  const after = timeline[index];
  const fraction = (duration_s - before.duration_s) / (after.duration_s - before.duration_s);
  return lerp(before.distance_m, after.distance_m, fraction);
}

/** When the plan had the runner reach `distance_m`: the arrival, where it planned a stop. */
export function plannedDurationAt(timeline, distance_m) {
  const index = lowerBound(timeline, "distance_m", distance_m);
  if (index === 0) return timeline[0].duration_s;
  if (index === timeline.length) return timeline.at(-1).duration_s;
  const before = timeline[index - 1];
  const after = timeline[index];
  if (after.distance_m === distance_m) return after.duration_s;
  const fraction = (distance_m - before.distance_m) / (after.distance_m - before.distance_m);
  return lerp(before.duration_s, after.duration_s, fraction);
}

/**
 * The point on the planned route `distance_m` along it, between the profile's points so
 * the plan's runner glides rather than steps every 100 m.
 */
export function routePointAt(profile, distance_m) {
  const index = Math.min(
    Math.max(1, lowerBound(profile, "distance_m", distance_m)),
    profile.length - 1,
  );
  const before = profile[index - 1];
  const after = profile[index];
  const span = after.distance_m - before.distance_m;
  const fraction = span > 0 ? Math.min(1, Math.max(0, (distance_m - before.distance_m) / span)) : 0;
  return {
    longitude: lerp(before.longitude, after.longitude, fraction),
    latitude: lerp(before.latitude, after.latitude, fraction),
  };
}

/**
 * Where the runner was at `duration_s`, between the track's points (one every 50 m run).
 * `distance_m` is their progress along the plan: off the trace, where the track has none,
 * the last one known, with `on_route` false so the readout can say so. Before the start or
 * after the last point, the runner waits at the end.
 */
export function trackPointAt(track, duration_s) {
  const index = Math.min(
    Math.max(1, lowerBound(track, "duration_s", duration_s)),
    track.length - 1,
  );
  const before = track[index - 1];
  const after = track[index];
  const span = after.duration_s - before.duration_s;
  const fraction = span > 0 ? Math.min(1, Math.max(0, (duration_s - before.duration_s) / span)) : 1;
  const last = fraction === 1 ? after : before;
  let distance_m;
  if (before.distance_m != null && after.distance_m != null) {
    distance_m = lerp(before.distance_m, after.distance_m, fraction);
  } else {
    distance_m = lastKnownDistance(track, last === after ? index : index - 1);
  }
  return {
    longitude: lerp(before.longitude, after.longitude, fraction),
    latitude: lerp(before.latitude, after.latitude, fraction),
    distance_m,
    on_route: last.on_route,
  };
}

function lastKnownDistance(track, from) {
  for (let i = from; i >= 0; i--) {
    if (track[i].distance_m != null) return track[i].distance_m;
  }
  return 0;
}

/** How long the replay runs: until the later of the runner and the plan's runner is done. */
export const replayDuration = (report, timeline) =>
  Math.max(report.track.at(-1).duration_s, timeline.at(-1).duration_s);

/**
 * The replay at `duration_s`: both runners, and how far the runner is behind the plan
 * (positive) or ahead, in meters along the route and in seconds, as the gap chart counts.
 */
export function replayAt(report, timeline, duration_s) {
  const actual = trackPointAt(report.track, duration_s);
  const planned_m = plannedDistanceAt(timeline, duration_s);
  // Once the runner is done (finished or not), their time stops with them.
  const actual_s = Math.min(duration_s, report.track.at(-1).duration_s);
  return {
    actual,
    planned: { ...routePointAt(report.profile, planned_m), distance_m: planned_m },
    gap_m: planned_m - actual.distance_m,
    delta_s: actual_s - plannedDurationAt(timeline, actual.distance_m),
  };
}

/** Replay speeds (race seconds per second), and the first to fit the race in ~a minute. */
export const REPLAY_SPEEDS = [60, 120, 300, 600, 1200, 2400];
export const defaultSpeed = (duration_s) =>
  REPLAY_SPEEDS.find((speed) => duration_s / speed <= 90) ?? REPLAY_SPEEDS.at(-1);
