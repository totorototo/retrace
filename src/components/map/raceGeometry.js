import { profileAt } from "../story/debrief.js";

// The report's series as map geometry: [lng, lat] pairs, GeoJSON's order and Mapbox's.

/** The planned route, from the profile. */
export const plannedCoordinates = (report) =>
  report.profile.map((point) => [point.longitude, point.latitude]);

/**
 * The actual track, cut into runs on and off the planned trace. Neighbouring runs share
 * the point where they meet, so the line has no gap.
 */
export function trackRuns(track) {
  const runs = [];
  let current = null;
  for (const point of track) {
    const coordinate = [point.longitude, point.latitude];
    if (current?.on_route !== point.on_route) {
      const joint = current?.coordinates.at(-1);
      current = { on_route: point.on_route, coordinates: joint ? [joint] : [] };
      runs.push(current);
    }
    current.coordinates.push(coordinate);
  }
  return runs.filter((run) => run.coordinates.length >= 2);
}

/** Runs as a GeoJSON FeatureCollection, each tagged with `on_route` for styling. */
export const trackGeoJSON = (track) => ({
  type: "FeatureCollection",
  features: trackRuns(track).map((run) => ({
    type: "Feature",
    properties: { on_route: run.on_route },
    geometry: { type: "LineString", coordinates: run.coordinates },
  })),
});

/** The checkpoints placed on the planned route by their distance along it. */
export const checkpointPositions = (report) =>
  report.checkpoints.map((checkpoint) => {
    const point = profileAt(report.profile, checkpoint.distance_m);
    return { name: checkpoint.name, longitude: point.longitude, latitude: point.latitude };
  });

/** [[west, south], [east, north]] around every coordinate given. */
export function bounds(coordinates) {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  // Loops, not Math.min(...spread): a long track overflows the call stack (as in Terminus).
  for (const [lng, lat] of coordinates) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [
    [west, south],
    [east, north],
  ];
}
