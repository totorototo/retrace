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
