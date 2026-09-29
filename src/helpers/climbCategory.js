// Copied from Terminus: Strava/Tour de France style categories, score = length (m) × average
// gradient (%), Strava's published cutoffs. Reads debriefz's climb fields.
const CATEGORIES = [
  { key: "4", minScore: 8_000 },
  { key: "3", minScore: 16_000 },
  { key: "2", minScore: 32_000 },
  { key: "1", minScore: 64_000 },
  { key: "HC", minScore: 80_000 },
];

/**
 * Categorizes a climb. Returns null when it is too mild to rank (below Cat 4): it still
 * shows up in the list, just without a badge.
 */
export function getClimbCategory(climb) {
  const score = climb.distance_m * climb.gradient_percent_average;

  let matchIndex = -1;
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (score >= CATEGORIES[i].minScore) matchIndex = i;
  }
  if (matchIndex === -1) return null;

  const { key } = CATEGORIES[matchIndex];
  return { key, score };
}
