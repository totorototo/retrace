import { useMemo } from "react";

import { projectPoints, VIEW } from "./offlineRouteProjection.js";

// Adapted from Terminus: the route drawn without a basemap when Mapbox can't be reached.
// Here several lines (the plan, the track's runs) share one projection, fitted to all.
// Markers ({ coordinate, fill, stroke }: the cursor, the replay's runners) are projected on
// their own: they move every frame of a replay, the lines never do.
export default function OfflineRoutePreview({ lines, markers = [] }) {
  const { paths, toSvg } = useMemo(() => {
    const { toSvg } = projectPoints(lines.flatMap((line) => line.coordinates));
    return {
      paths: lines.map((line) => ({
        ...line,
        points: line.coordinates.map((coordinate) => toSvg(coordinate).join(",")).join(" "),
      })),
      toSvg,
    };
  }, [lines]);

  return (
    <>
      <svg
        className="offline-preview"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Route preview (map tiles unavailable offline)"
      >
        {paths.map((path, index) => (
          <polyline
            key={index}
            points={path.points}
            fill="none"
            stroke={path.color}
            strokeOpacity={path.opacity}
            strokeWidth={path.width}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {markers.map((marker, index) => {
          const [cx, cy] = toSvg(marker.coordinate);
          return (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={8}
              fill={marker.fill}
              stroke={marker.stroke}
              strokeWidth={marker.stroke ? 3 : 0}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="offline-badge">Offline: map tiles unavailable</div>
    </>
  );
}
