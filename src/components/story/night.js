// When the race ran in the dark, from the sun's position: no network, no lookup table, so it
// works offline as the rest of the story does. Pure, as debrief.js.

import { trackPointAt } from "../map/replay.js";
import { deviationSpans, isOffTrace } from "./debrief.js";

const rad = (degrees) => (degrees * Math.PI) / 180;
const deg = (radians) => (radians * 180) / Math.PI;

/**
 * The sun's altitude above the horizon, in degrees, at `epoch_s` seen from `latitude`,
 * `longitude`. The US Naval Observatory's low-precision formulas: within a minute of arc
 * this century, far finer than a dusk to the minute needs.
 */
export function sunAltitude(epoch_s, latitude, longitude) {
  const days = epoch_s / 86400 - 10957.5; // since J2000.0 (2000-01-01 12:00 UTC)
  const anomaly = rad(357.529 + 0.98560028 * days);
  const meanLongitude = 280.459 + 0.98564736 * days;
  const eclipticLongitude = rad(
    meanLongitude + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly),
  );
  const obliquity = rad(23.439 - 0.00000036 * days);
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const siderealHours = 18.697374558 + 24.06570982441908 * days;
  const hourAngle = rad(siderealHours * 15 + longitude) - rightAscension;
  const lat = rad(latitude);
  return deg(
    Math.asin(
      Math.sin(lat) * Math.sin(declination) +
        Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
    ),
  );
}

/**
 * Dark: the sun more than 6° below the horizon, past civil dusk.
 * why: civil twilight, not sunset: for half an hour after sunset there is still light to run
 * by, and the headlamp goes on at about civil dusk.
 */
export const DARK_ALTITUDE = -6;
const STEP_S = 60;

const cache = new WeakMap();

/**
 * The stretches run in the dark: race time and, through the track, distance along the plan.
 * Sampled every minute where the runner was. Cached per report: three charts ask for it.
 */
export function nightSpans(report) {
  if (cache.has(report)) return cache.get(report);
  const { track, totals } = report;
  const spans = [];
  if (track.length >= 2) {
    const end_s = track.at(-1).duration_s;
    let open = null;
    for (let duration_s = 0; duration_s <= end_s + STEP_S; duration_s += STEP_S) {
      const at = Math.min(duration_s, end_s);
      const point = trackPointAt(track, at);
      const dark =
        sunAltitude(totals.epoch_s_start_actual + at, point.latitude, point.longitude) <
        DARK_ALTITUDE;
      if (dark && open == null) open = { start_s: at, start_m: point.distance_m };
      if ((!dark || duration_s > end_s) && open != null) {
        spans.push({ ...open, end_s: at, end_m: point.distance_m });
        open = null;
      }
      if (duration_s > end_s) break;
    }
  }
  cache.set(report, spans);
  return spans;
}

/**
 * Actual over planned time by night and by day, every profile point (100 m), each step put
 * where its middle was run. Stops count (the profile's clocks include them) and detours
 * don't (their times are the rejoin's). Null for a part with no time planned.
 */
export function dayNightRatios(report, spans) {
  const deviations = deviationSpans(report);
  const sums = { night: [0, 0], day: [0, 0] };
  const { profile } = report;
  for (let index = 1; index < profile.length; index++) {
    const [a, b] = [profile[index - 1], profile[index]];
    if (a.duration_s_actual == null || b.duration_s_actual == null) break;
    if (isOffTrace(deviations, (a.distance_m + b.distance_m) / 2)) continue;
    const middle_s = (a.duration_s_actual + b.duration_s_actual) / 2;
    const dark = spans.some((span) => middle_s >= span.start_s && middle_s < span.end_s);
    const sum = sums[dark ? "night" : "day"];
    sum[0] += b.duration_s_actual - a.duration_s_actual;
    sum[1] += b.duration_s_planned - a.duration_s_planned;
  }
  const ratio = ([actual, planned]) => (planned > 0 ? actual / planned : null);
  return { night: ratio(sums.night), day: ratio(sums.day) };
}
