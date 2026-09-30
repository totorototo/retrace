import { memo, useMemo } from "react";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { useDistanceCursor } from "../../../hooks/useDistanceCursor.js";
import useStore from "../../../store/store.js";
import { formatDuration } from "../../../utils/format.js";
import { paceHalves, sectionSpans, toneOfRatio } from "../debrief.js";
import StorySection from "../StorySection.jsx";
import AxisNames from "./AxisNames.jsx";
import style from "./StoryPace.style.js";

const WIDTH = 300;
const HEIGHT = 110;
const VPAD = 6;

const ratio = (value) => (value == null ? "–" : `${value.toFixed(2)}×`);

// why: bars as wide as their section (a Marimekko) rather than equal-width: a 21 km section
// at 1.17× costs far more than a 6 km one at 1.67×, and area is what the eye compares.
const StoryPace = memo(function StoryPace({ className }) {
  const report = useStore((state) => state.report);
  const distance_m_max = report.totals.distance_m_planned;
  const [cursor_m, cursorHandlers] = useDistanceCursor(distance_m_max);

  const chart = useMemo(() => {
    const spans = sectionSpans(report);
    const ratios = spans.map((span) => span.pace_ratio).filter((value) => value != null);
    const min = Math.min(1, ...ratios);
    const max = Math.max(1, ...ratios);
    const pad = (max - min || 0.2) * 0.1;

    const scaleX = createXScale({ min: 0, max: distance_m_max }, { min: 0, max: WIDTH });
    const scaleY = createYScale({ min: min - pad, max: max + pad }, { min: HEIGHT, max: 0 });
    const oneY = scaleY(1);

    const bars = spans.map((span) => {
      const x = scaleX(span.start_m);
      const y = span.pace_ratio == null ? oneY : scaleY(span.pace_ratio);
      return {
        span,
        x,
        width: Math.max(0, scaleX(span.end_m) - x - 0.6),
        y: Math.min(y, oneY),
        height: Math.abs(y - oneY),
        tone: toneOfRatio(span.pace_ratio),
      };
    });

    const names = report.checkpoints.slice(1, -1).map((checkpoint) => ({
      pct: (scaleX(checkpoint.distance_m) / WIDTH) * 100,
      name: checkpoint.name,
    }));

    return { spans, bars, names, min, max, oneY, halves: paceHalves(spans, distance_m_max) };
  }, [report, distance_m_max]);

  const { spans, bars, names, min, max, oneY, halves } = chart;
  const active =
    cursor_m == null
      ? null
      : spans.findIndex((span) => cursor_m >= span.start_m && cursor_m <= span.end_m);
  const shown = active == null || active < 0 ? null : spans[active];
  const slowest = spans.reduce(
    (best, span) => ((span.pace_ratio ?? 0) > (best?.pace_ratio ?? 0) ? span : best),
    null,
  );

  return (
    <div className={className}>
      <StorySection eyebrow="The pace" title="Section by section">
        <p className="lede">
          Moving time against the plan, stops left out. First half{" "}
          <strong>{ratio(halves[0])}</strong>, second half <strong>{ratio(halves[1])}</strong>
          {slowest && (
            <>
              ; slowest into {slowest.to} at <strong>{ratio(slowest.pace_ratio)}</strong>
            </>
          )}
          .
        </p>
        <div className="chart-frame">
          <div className="readout" data-testid="pace-readout">
            {shown ? (
              <>
                <span>
                  <b>
                    {shown.from} → {shown.to}
                  </b>
                </span>
                <span>
                  plan <b>{formatDuration(shown.moving_s_planned)}</b>
                </span>
                <span>
                  actual <b>{formatDuration(shown.moving_s_actual)}</b>
                </span>
                <span data-tone={toneOfRatio(shown.pace_ratio)}>
                  <b>{ratio(shown.pace_ratio)}</b>
                </span>
                {shown.heart_rate_bpm_average != null && (
                  <span>
                    HR <b>{Math.round(shown.heart_rate_bpm_average)}</b>
                  </span>
                )}
                {shown.distance_m_off_route > 0 && (
                  <span>
                    off route <b>{(shown.distance_m_off_route / 1000).toFixed(1)} km</b>
                  </span>
                )}
              </>
            ) : (
              <span>Point at a section for its times.</span>
            )}
          </div>

          <div className="plot" {...cursorHandlers}>
            <svg
              role="img"
              aria-label={`Actual over planned moving time per section, from ${ratio(min)} to ${ratio(max)}.`}
              viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
              preserveAspectRatio="none"
              width="100%"
              style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
            >
              {bars.map((bar, index) => (
                <rect
                  key={index}
                  className={`pace-bar${index === active ? " active" : ""}`}
                  data-tone={bar.tone}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                />
              ))}
              <line className="zero-line" x1={0} x2={WIDTH} y1={oneY} y2={oneY} />
            </svg>
            <span className="plot-label" style={{ top: 0 }}>
              {ratio(max)} slower
            </span>
            {min < 1 && (
              <span className="plot-label" style={{ bottom: 0 }}>
                {ratio(min)} faster
              </span>
            )}
          </div>

          <AxisNames markers={names} />
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryPace);
