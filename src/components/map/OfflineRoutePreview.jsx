import { useMemo } from "react";

import { projectPoints, VIEW } from "./offlineRouteProjection.js";

// Adapted from Terminus: the route drawn without a basemap when Mapbox can't be reached.
// Here several lines (the plan, the track's runs) share one projection, fitted to all.
export default function OfflineRoutePreview({ lines, marker, markerColor }) {
  const { paths, cursor } = useMemo(() => {
    const { toSvg } = projectPoints(lines.flatMap((line) => line.coordinates));
    return {
      paths: lines.map((line) => ({
        ...line,
        points: line.coordinates.map((coordinate) => toSvg(coordinate).join(",")).join(" "),
      })),
      cursor: marker ? toSvg(marker) : null,
    };
  }, [lines, marker]);

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
        {cursor && <circle cx={cursor[0]} cy={cursor[1]} r={8} fill={markerColor} />}
      </svg>
      <div className="offline-badge">Offline: map tiles unavailable</div>
    </>
  );
}
