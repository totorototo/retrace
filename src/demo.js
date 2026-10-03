// The race retrace shows: the author's Grand Raid des Pyrénées 2026 Ultra Tour, already public.
// Served from public/demo/, so the e2e tests can swap in the synthetic fixtures by URL.
const base = `${import.meta.env.BASE_URL}demo/`;

export const DEMO_FILES = {
  gpx: { name: "grp-160-2026.gpx", url: `${base}grp-160-2026.gpx` },
  fit: { name: "grp-160-2026.fit", url: `${base}grp-160-2026.fit` },
};
