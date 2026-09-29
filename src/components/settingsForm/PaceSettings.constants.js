import { DEFAULT_SETTINGS } from "../../store/store.js";

// Copied from Terminus's trailData/PaceSettings, on gpxz's setting names: pick the same
// profile and stop here as when the plan was made in Terminus, and the plans match.

/**
 * Runner profiles: each bundles a flat pace and a fatigue coefficient.
 * why: Default is retrace's own addition: Terminus plans with 500 s/km and 0.002 until a
 * profile is picked, and that matches none of its four. Without it, a plan made in Terminus
 * without touching the picker (the GRP one) couldn't be reproduced here.
 */
export const RUNNER_PROFILES = [
  {
    label: "Default",
    pace_base_s_per_km: DEFAULT_SETTINGS.pace_base_s_per_km,
    fatigue_coefficient: DEFAULT_SETTINGS.fatigue_coefficient,
    sub: "~8:20 min/km on flat: Terminus's default, before a profile is picked",
  },
  {
    label: "Casual",
    pace_base_s_per_km: 600,
    fatigue_coefficient: 0.004,
    sub: "~10 min/km on flat",
  },
  { label: "Trail", pace_base_s_per_km: 365, fatigue_coefficient: 0.003, sub: "~6 min/km on flat" },
  {
    label: "Athlete",
    pace_base_s_per_km: 330,
    fatigue_coefficient: 0.002,
    sub: "~5:30 min/km on flat",
  },
  { label: "Elite", pace_base_s_per_km: 300, fatigue_coefficient: 0.001, sub: "~5 min/km on flat" },
];

export const LIFE_BASE_STOP_OPTIONS = [
  { label: "None", value: 0, sub: "No rest at checkpoints" },
  { label: "30 min", value: 1800, sub: "Quick stop at each LifeBase" },
  { label: "1 hour", value: 3600, sub: "Full rest at each LifeBase" },
  { label: "2 hours", value: 7200, sub: "Long rest at each LifeBase" },
];

/**
 * The profile the settings are exactly, or null (settings only ever come from these buttons,
 * so null means a bug, not a plan).
 * why: exact, where Terminus shows the closest: here the settings must be the plan's, and
 * a highlighted profile that isn't the one in effect would skew every number unnoticed.
 */
export const profileOf = (settings) =>
  RUNNER_PROFILES.find(
    (profile) =>
      profile.pace_base_s_per_km === settings.pace_base_s_per_km &&
      profile.fatigue_coefficient === settings.fatigue_coefficient,
  ) ?? null;

/** The stop option the settings are exactly, or null. */
export const stopOf = (settings) =>
  LIFE_BASE_STOP_OPTIONS.find((option) => option.value === settings.life_base_stop_s) ?? null;
