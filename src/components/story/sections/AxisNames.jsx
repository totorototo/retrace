import { useEffect, useRef, useState } from "react";

import { spacedNames } from "../debrief.js";

// A name's width at the axis's 9px mono (12 characters and the ellipsis), plus a gap.
const NAME_PX = 78;

/**
 * Checkpoint names under a distance chart, as many as fit its measured width.
 * why: a fixed spacing in percent fits a desktop chart but lets names overlap at phone
 * width, where 18% is 50px for a 70px name. Before the first measure, the 18% default.
 */
export default function AxisNames({ markers }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const names = width > 0 ? spacedNames(markers, (NAME_PX / width) * 100) : spacedNames(markers);

  return (
    <div className="axis-names" ref={ref}>
      {names.map((marker, index) => (
        <span key={index} className="axis-name" style={{ left: `${marker.pct}%` }}>
          {marker.name}
        </span>
      ))}
    </div>
  );
}
