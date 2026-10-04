// Display helpers. Durations are seconds; distances meters.

const pad = (n) => String(n).padStart(2, "0");

/** 3725 → "1h02". Null or undefined → "–". */
export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return "–";
  const total = Math.round(Math.abs(seconds) / 60);
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${Math.floor(total / 60)}h${pad(total % 60)}`;
}

/** Signed duration: +0h03, -0h05. */
export function formatDelta(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return "–";
  return seconds >= 0 ? `+${formatDuration(seconds)}` : formatDuration(seconds);
}

/** An axis tick on whole quarters: 0, "+1h", "−30'", "+1h30". */
export function formatTick(seconds) {
  if (seconds === 0) return "0";
  const minutes = Math.round(Math.abs(seconds) / 60);
  const [h, m] = [Math.floor(minutes / 60), minutes % 60];
  const text = h === 0 ? `${m}'` : m === 0 ? `${h}h` : `${h}h${m}`;
  return `${seconds > 0 ? "+" : "−"}${text}`;
}

/** 6012 → "6.0 km". */
export function formatKm(meters, digits = 1) {
  if (meters == null || !Number.isFinite(meters)) return "–";
  return `${(meters / 1000).toFixed(digits)} km`;
}

/** 500 s/km → "8:20/km". */
export function formatPace(secondsPerKm) {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm)) return "–";
  const s = Math.round(secondsPerKm);
  return `${Math.floor(s / 60)}:${pad(s % 60)}/km`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The race's own wall clock: UTC shifted by the device's offset, read back as UTC so the
// viewer's time zone never enters it.
const raceDate = (epoch_s, utc_offset_s) => new Date((epoch_s + (utc_offset_s ?? 0)) * 1000);

/**
 * An epoch as the race's time of day, with the weekday: a 49 h race spans three days, and
 * "23:05" alone doesn't say which. 1787346348, 7200 → "Fri 23:05". Null → "–".
 */
export function formatClock(epoch_s, utc_offset_s) {
  if (epoch_s == null || !Number.isFinite(epoch_s)) return "–";
  const date = raceDate(epoch_s, utc_offset_s);
  return `${DAYS[date.getUTCDay()]} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** The race's calendar day: 1787281427, 7200 → "Fri 21 Aug". */
export function formatDay(epoch_s, utc_offset_s) {
  if (epoch_s == null || !Number.isFinite(epoch_s)) return "–";
  const date = raceDate(epoch_s, utc_offset_s);
  return `${DAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** 7200 → "UTC+2", -16200 → "UTC−4:30", 0 or null → "UTC". */
export function formatUtcOffset(utc_offset_s) {
  if (!utc_offset_s) return "UTC";
  const minutes = Math.round(Math.abs(utc_offset_s) / 60);
  const [h, m] = [Math.floor(minutes / 60), minutes % 60];
  return `UTC${utc_offset_s > 0 ? "+" : "−"}${h}${m ? `:${pad(m)}` : ""}`;
}
