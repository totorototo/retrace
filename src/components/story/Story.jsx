import { curveCatmullRom, line as d3Line } from "d3-shape";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { createXScale, createYScale } from "../../helpers/d3.js";
import useStore from "../../store/store.js";
import { gapSeries } from "./debrief.js";
import style from "./Story.style.js";
import StoryDotNav from "./StoryDotNav.jsx";
import { STORY_SECTIONS } from "./storySections.js";

// Copied from Terminus's Story: scrollspy sections, a dot nav portalled to <body> (see the
// why-comments there), and a background contour running the length of the page.
const CONTOUR_WIDTH = 200;
const CONTOUR_HEIGHT = 1000;

// Terminus draws the route's elevation, rotated: distance runs down the page. The report
// has no elevation series yet, so the throughline here is the gap to the plan, rotated the
// same way: scrolling down walks the race, and the line drifts right as time is lost.
function buildContour(points) {
  if (points.length < 2) return null;
  const deltas = points.map((point) => point.delta_s);
  const min = Math.min(0, ...deltas);
  const max = Math.max(0, ...deltas);
  const range = max - min || 1;

  const scaleDelta = createXScale(
    { min: min - range * 0.15, max: max + range * 0.15 },
    { min: CONTOUR_WIDTH * 0.15, max: CONTOUR_WIDTH * 0.85 },
  );
  const scaleDistance = createYScale(
    { min: 0, max: points.at(-1).distance_m },
    { min: 0, max: CONTOUR_HEIGHT },
  );

  return d3Line()
    .x((point) => scaleDelta(point.delta_s))
    .y((point) => scaleDistance(point.distance_m))
    .curve(curveCatmullRom.alpha(0.5))(points);
}

const Story = memo(function Story({ className }) {
  const report = useStore((state) => state.report);
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const contour = useMemo(() => buildContour(gapSeries(report)), [report]);

  const jumpToIndex = (index) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // A thin band near the top of the viewport decides the current section, and the topmost
  // section crossing it wins (Terminus's why-comments explain both).
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        const index = sectionRefs.current.indexOf(topmost.target);
        if (index !== -1) setActiveIndex(index);
      },
      { rootMargin: "-15% 0px -80% 0px", threshold: 0 },
    );
    sectionRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {createPortal(<StoryDotNav activeIndex={activeIndex} onJump={jumpToIndex} />, document.body)}
      <div className={className} data-testid="story">
        {contour && (
          <svg
            className="story-contour"
            viewBox={`0 0 ${CONTOUR_WIDTH} ${CONTOUR_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={contour} className="contour-line" fill="none" />
          </svg>
        )}
        <div className="story-content">
          {STORY_SECTIONS.map(({ id, Component }, index) => (
            <div
              key={id}
              id={`story-${id}`}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
            >
              <Component />
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

export default style(Story);
