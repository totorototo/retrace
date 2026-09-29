import useStore from "../store/store.js";

/**
 * The cursor along a chart whose x axis is distance, 0 to `distance_m_max`. Shared through
 * the store, so every chart and the map follow whichever one is under the pointer. Returns
 * the cursor (null when it's on none) and the handlers to spread on the plot.
 */
export function useDistanceCursor(distance_m_max) {
  const cursor_m = useStore((state) => state.cursor_m);
  const setCursor = useStore((state) => state.setCursor);

  // Pointer events cover mouse, pen and touch alike. Touch drags only move the cursor
  // where the element sets touch-action: pan-y, so vertical swipes still scroll the page.
  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setCursor(fraction * distance_m_max);
  };
  const onPointerLeave = () => setCursor(null);

  return [cursor_m, { onPointerMove, onPointerDown: onPointerMove, onPointerLeave }];
}
