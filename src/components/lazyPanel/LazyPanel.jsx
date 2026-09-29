import { Suspense } from "react";

import { useInView } from "../../hooks/useInView.js";
import style from "./LazyPanel.style.js";

// Copied from Terminus. Defers mounting a heavy panel (mapbox) until it nears the viewport,
// keeping its chunk out of the initial bundle. A fixed-size placeholder holds its place
// while the chunk loads. Pair with a `lazy()`-imported child.
function LazyPanel({ className, children, rootMargin = "200px" }) {
  const [ref, inView] = useInView({ rootMargin });

  return (
    <div className={className} ref={ref}>
      {inView ? (
        <Suspense
          fallback={
            <div className="lazy-panel-placeholder" role="status">
              <div className="lazy-panel-spinner" />
              <span className="lazy-panel-sr-only">Loading…</span>
            </div>
          }
        >
          {children}
        </Suspense>
      ) : (
        <div className="lazy-panel-placeholder" />
      )}
    </div>
  );
}

export default style(LazyPanel);
