// The suite's checkpoint row, Retrace's figures: what a row prints for one checkpoint of the
// report. Pure, so the arithmetic is tested on its own. Seconds, as in the report.

/**
 * Spare at departure as the row prints it: the report's margin (the cutoff minus the actual
 * arrival and stop, debriefz). Its departure is never printed, so it is not recounted on
 * clock minutes: the lede, the chart and the row all print this one figure. A departure
 * seconds past the cutoff still rounds to "0h00", so a missed cutoff reads at least a minute
 * over. Null without a cutoff.
 */
export function spareAtDeparture(checkpoint) {
  const { margin_s_actual } = checkpoint;
  if (margin_s_actual == null || !Number.isFinite(margin_s_actual)) return null;
  if (margin_s_actual < 0 && margin_s_actual > -30) return -60;
  return margin_s_actual;
}

// One vocabulary in every Trail Suite app (the design system's Status badge): 1h or more to
// the cutoff is OK, under 1h Tight, past it Over.
const TIGHT_S = 3600;

export const BADGE_LABELS = { ok: "OK", tight: "Tight", over: "Over" };

export function marginTier(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  if (seconds < 0) return "over";
  return seconds < TIGHT_S ? "tight" : "ok";
}

// Six rows, then the rest behind "Show N more": the design system's checkpoint list.
export const VISIBLE_ROWS = 6;
