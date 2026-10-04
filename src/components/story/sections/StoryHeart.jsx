import { curveMonotoneX, line as d3Line } from "d3-shape";
import { memo, useMemo } from "react";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { useDistanceCursor } from "../../../hooks/useDistanceCursor.js";
import useStore from "../../../store/store.js";
import {
  deviationSpans,
  heartRateSeries,
  isOffTrace,
  profileAt,
  sectionSpans,
} from "../debrief.js";
import StorySection from "../StorySection.jsx";
import AxisNames from "./AxisNames.jsx";
import DeviationBands from "./DeviationBands.jsx";
import style from "./StoryHeart.style.js";

const WIDTH = 300;
// Shorter than the other charts: the trend is all it has to show.
const HEIGHT = 60;
const VPAD = 6;

const bpm = (value) => Math.round(value);
const ratio = (value) => (value == null ? "–" : `${value.toFixed(2)}×`);

/**
 * The heart rate from the first section to the last, beside the pace's direction: facts only.
 * why: slower at a lower heart rate points at the legs more than the heart, but a sentence
 * can't know that; the reader can.
 */
function Lede({ spans }) {
  const measured = spans.filter(
    (span) => span.heart_rate_bpm_average != null && span.pace_ratio != null,
  );
  if (measured.length < 2) return null;
  const [first, last] = [measured[0], measured.at(-1)];
  const [from, to] = [bpm(first.heart_rate_bpm_average), bpm(last.heart_rate_bpm_average)];
  return (
    <p className="lede">
      From <strong>{from}</strong> bpm on the first section to <strong>{to}</strong> on the last,
      while the pace {last.pace_ratio > first.pace_ratio ? "slowed" : "quickened"}.
    </p>
  );
}

// The heart rate along the route, a rolling mean over 2 km: the trend over 49 hours, which
// the bars of the pace section averaged away. The section's own average and pace in the
// readout tie the two together.
const StoryHeart = memo(function StoryHeart({ className }) {
  const report = useStore((state) => state.report);
  const distance_m_max = report.totals.distance_m_planned;
  const [cursor_m, cursorHandlers] = useDistanceCursor(distance_m_max);

  const chart = useMemo(() => {
    const series = heartRateSeries(report);
    // Off the trace, the line breaks (the plan has no points there): each stretch shows the
    // average the watch recorded over it instead, as a level across its width.
    const deviations = deviationSpans(report);
    const rates = [
      ...series.map((point) => point.bpm),
      ...deviations.map((span) => span.heart_rate_bpm_average),
    ].filter((value) => value != null);
    if (rates.length < 2) return null;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const pad = (max - min || 10) * 0.1;
    const scaleX = createXScale({ min: 0, max: distance_m_max }, { min: 0, max: WIDTH });
    const scaleY = createYScale({ min: min - pad, max: max + pad }, { min: HEIGHT, max: 0 });
    // why: monotone, as the gap: a spline would overshoot between points and draw a heart
    // rate never reached.
    const path = d3Line()
      .defined((point) => point.bpm != null)
      .x((point) => scaleX(point.distance_m))
      .y((point) => scaleY(point.bpm))
      .curve(curveMonotoneX)(series);
    const checkpoints = report.checkpoints.slice(1, -1).map((checkpoint) => {
      const x = scaleX(checkpoint.distance_m);
      return { x, pct: (x / WIDTH) * 100, name: checkpoint.name };
    });
    return {
      series,
      min,
      max,
      scaleX,
      scaleY,
      path,
      checkpoints,
      spans: sectionSpans(report),
      deviations,
      levels: deviations
        .filter((span) => span.heart_rate_bpm_average != null)
        .map((span) => ({
          x1: scaleX(span.start_m),
          x2: scaleX(span.end_m),
          y: scaleY(span.heart_rate_bpm_average),
        })),
    };
  }, [report, distance_m_max]);

  if (!chart) {
    return (
      <div className={className}>
        <StorySection eyebrow="The heart" title="Heart rate">
          <p className="lede" data-testid="heart-none">
            No heart rate in this recording.
          </p>
        </StorySection>
      </div>
    );
  }

  const { series, min, max, scaleX, scaleY, path, checkpoints, spans, deviations, levels } = chart;
  const detour =
    cursor_m == null || !isOffTrace(deviations, cursor_m)
      ? null
      : deviations.find((span) => cursor_m > span.start_m && cursor_m < span.end_m);
  const shown = cursor_m == null ? null : profileAt(series, cursor_m);
  const section =
    cursor_m == null
      ? null
      : spans.find((span) => cursor_m >= span.start_m && cursor_m <= span.end_m);

  return (
    <div className={className}>
      <StorySection eyebrow="The heart" title="Heart rate">
        <Lede spans={spans} />
        <div className="chart-frame">
          <div className="readout" data-testid="heart-readout">
            {shown ? (
              <>
                <span>
                  km <b>{(shown.distance_m / 1000).toFixed(1)}</b>
                </span>
                {detour ? (
                  <span>
                    off the trace
                    {detour.heart_rate_bpm_average != null && (
                      <>
                        {" "}
                        · avg <b>{bpm(detour.heart_rate_bpm_average)}</b> bpm
                      </>
                    )}
                  </span>
                ) : shown.bpm == null ? (
                  <span>no heart rate here</span>
                ) : (
                  <span>
                    <b>{bpm(shown.bpm)}</b> bpm
                  </span>
                )}
                {section && (
                  <>
                    <span>
                      {section.from} → {section.to}
                    </span>
                    {section.heart_rate_bpm_average != null && (
                      <span>
                        avg <b>{bpm(section.heart_rate_bpm_average)}</b>
                      </span>
                    )}
                    <span>
                      pace <b>{ratio(section.pace_ratio)}</b>
                    </span>
                  </>
                )}
              </>
            ) : (
              <span>Point along the route for the heart rate there.</span>
            )}
          </div>

          <div className="plot" {...cursorHandlers}>
            <svg
              role="img"
              aria-label={`Heart rate along the route, smoothed over 2 km, from ${bpm(min)} to ${bpm(max)} bpm.`}
              viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
              preserveAspectRatio="none"
              width="100%"
              style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
            >
              {checkpoints.map((checkpoint, index) => (
                <line
                  key={index}
                  className="checkpoint-line"
                  x1={checkpoint.x}
                  x2={checkpoint.x}
                  y1={-VPAD}
                  y2={HEIGHT + VPAD}
                />
              ))}
              <DeviationBands
                spans={deviations}
                scaleX={scaleX}
                top={-VPAD}
                height={HEIGHT + VPAD * 2}
              />
              <path className="heart-line" d={path} />
              {levels.map((level, index) => (
                <line
                  key={index}
                  className="detour-level"
                  x1={level.x1}
                  x2={level.x2}
                  y1={level.y}
                  y2={level.y}
                />
              ))}
              {shown && (
                <line
                  className="cursor-line"
                  x1={scaleX(shown.distance_m)}
                  x2={scaleX(shown.distance_m)}
                  y1={-VPAD}
                  y2={HEIGHT + VPAD}
                />
              )}
            </svg>
            <span className="plot-label" style={{ top: 0 }}>
              {bpm(max)} bpm
            </span>
            <span className="plot-label" style={{ bottom: 0 }}>
              {bpm(min)} bpm
            </span>
            {shown?.bpm != null && (
              <span
                className="cursor-dot"
                style={{
                  left: `${(scaleX(shown.distance_m) / WIDTH) * 100}%`,
                  top: `${((scaleY(shown.bpm) + VPAD) / (HEIGHT + VPAD * 2)) * 100}%`,
                }}
              />
            )}
          </div>

          <AxisNames markers={checkpoints} />
          {deviations.length > 0 && (
            <div className="legend">
              <span className="legend-item">
                <span className="legend-swatch deviation-swatch" />
                off the planned trace
              </span>
              <span className="legend-item">
                <span className="legend-swatch detour-swatch" />
                its average heart rate
              </span>
            </div>
          )}
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryHeart);
