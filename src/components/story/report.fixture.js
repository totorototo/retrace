// A small debriefz report, consistent with itself: 3.5 km, one aid station at 1.5 km with a
// 10 min stop planned. Finished 6h40 behind (400 s). Shaped like `analyze`'s JSON.
const checkpoint = (fields) => ({
  type_name: null,
  elevation_gain_m: 0,
  stop_s_planned: 0,
  stop_s_actual: 0,
  epoch_s_arrival_actual: null,
  epoch_s_cutoff: null,
  margin_s_planned: null,
  margin_s_actual: null,
  ...fields,
});

function profilePoint(distance_m, elevation_m, planned, actual, heartRate) {
  return {
    distance_m,
    elevation_m,
    latitude: 45 + distance_m / 1e5,
    longitude: 6,
    duration_s_planned: planned,
    duration_s_actual: actual,
    heart_rate_bpm_average: heartRate,
  };
}

function trackPoint(km, duration_s, on_route) {
  return {
    latitude: 45 + km / 100,
    longitude: on_route ? 6 : 6.002,
    duration_s,
    distance_m: km * 1000,
    on_route,
  };
}

export const report = {
  name: "Test Trail",
  settings: {},
  totals: {
    distance_m_planned: 3500,
    elevation_gain_m_planned: 250,
    distance_m_device: 3600,
    ascent_m_device: 240,
    duration_s_planned: 2400,
    duration_s_actual: 2800,
    moving_s_actual: 2400,
    stopped_s_actual: 400,
    distance_m_reached: 3500,
    finished: true,
    samples: 2800,
    samples_off_route: 0,
    distance_m_off_route: 0,
    records_without_position: 0,
    epoch_s_start_planned: null,
    epoch_s_start_actual: 0,
    utc_offset_s: null,
  },
  checkpoints: [
    checkpoint({
      name: "Start",
      distance_m: 0,
      duration_s_planned: 0,
      duration_s_actual: 0,
      delta_s: 0,
    }),
    checkpoint({
      name: "Aid",
      distance_m: 1500,
      duration_s_planned: 600,
      duration_s_actual: 900,
      delta_s: 300,
      stop_s_planned: 600,
      stop_s_actual: 400,
      margin_s_planned: 1800,
      margin_s_actual: 1500,
    }),
    checkpoint({
      name: "Finish",
      distance_m: 3500,
      duration_s_planned: 2400,
      duration_s_actual: 2800,
      delta_s: 400,
      stop_s_actual: null,
      margin_s_planned: 1200,
      margin_s_actual: -120,
    }),
  ],
  sections: [
    {
      from: "Start",
      to: "Aid",
      distance_m: 1500,
      elevation_gain_m: 200,
      elevation_loss_m: 0,
      moving_s_planned: 600,
      moving_s_actual: 900,
      stopped_s_actual: 0,
      pace_ratio: 1.5,
      heart_rate_bpm_average: 150,
      distance_m_off_route: 0,
    },
    {
      from: "Aid",
      to: "Finish",
      distance_m: 2000,
      elevation_gain_m: 50,
      elevation_loss_m: 250,
      moving_s_planned: 1200,
      moving_s_actual: 1500,
      stopped_s_actual: 400,
      pace_ratio: 1.25,
      heart_rate_bpm_average: 140,
      distance_m_off_route: 0,
    },
  ],
  climbs: [],
  splits: [
    { distance_m: 1000, duration_s_planned: 400, duration_s_actual: 340 },
    { distance_m: 2000, duration_s_planned: 1500, duration_s_actual: 1500 },
    { distance_m: 3000, duration_s_planned: 2100, duration_s_actual: 2400 },
  ],
  deviations: [
    {
      distance_m_left: 2200,
      distance_m_rejoined: 2600,
      duration_s_left: 1700,
      duration_s: 240,
      distance_m: 450,
      offset_m_max: 120,
    },
  ],
  calibration: null,
  // Every 1000 m and at the end: the splits' times, on a small hill.
  profile: [
    profilePoint(0, 1000, 0, 0, null),
    profilePoint(1000, 1200, 400, 340, 150),
    profilePoint(2000, 1100, 1500, 1500, 145),
    profilePoint(3000, 1150, 2100, 2400, 140),
    profilePoint(3500, 1000, 2400, 2800, 138),
  ],
  // Off the trace for two points between 2200 and 2600 m.
  track: [
    trackPoint(0, 0, true),
    trackPoint(1, 700, true),
    trackPoint(2, 1600, true),
    trackPoint(2.2, 1700, false),
    trackPoint(2.4, 1850, false),
    trackPoint(2.6, 1940, true),
    trackPoint(3.5, 2800, true),
  ],
};
