import { useState } from "react";

/**
 * A cursor along a chart whose x axis is distance, 0 to `distance_m_max`. Returns the
 * distance under the pointer (null when it's off the chart) and the handlers to spread on
 * the element spanning the plot.
 */
export function useDistanceCursor(distance_m_max) {
  const [distance_m, setDistance] = useState(null);

  // Pointer events cover mouse, pen and touch alike. Touch drags only move the cursor
  // where the element sets touch-action: pan-y, so vertical swipes still scroll the page.
  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setDistance(fraction * distance_m_max);
  };
  const onPointerLeave = () => setDistance(null);

  return [distance_m, { onPointerMove, onPointerDown: onPointerMove, onPointerLeave }];
}
