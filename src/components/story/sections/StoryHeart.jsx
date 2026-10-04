import { curveMonotoneX, line as d3Line } from "d3-shape";
import { memo, useMemo } from "react";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { useDistanceCursor } from "../../../hooks/useDistanceCursor.js";
import useStore from "../../../store/store.js";
import {
  deviationSpans,
  HEART_VERDICTS,
  heartHalves,
  heartPaceSeries,
  heartQuadrant,
  isOffTrace,
  profileAt,
  sectionSpans,
} from "../debrief.js";
import StorySection from "../StorySection.jsx";
import AxisNames from "./AxisNames.jsx";
import DeviationBands from "./DeviationBands.jsx";
import style from "./StoryHeart.style.js";

const WIDTH = 300;
// Shorter than the other charts: the trends are all it has to show.
const HEIGHT = 90;
const VPAD = 6;
const bpm = (value) => Math.round(value);
const ratio = (value) => (value == null ? "–" : `${value.toFixed(2)}×`);
const percent = (value) =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(Math.round(value * 100))}%`;

/**
 * The second half against the first: the pace and the heart rate, which way they went, and
 * what the plan cost in heartbeats as a result.
 * why: the cost alone can hide its causes: a pace 14% slower at a heart rate 16% lower costs
 * the same, and says the fade wasn't the heart's.
 */
function Lede({ halves }) {
  const [first, second] = halves;
  const quadrant = heartQuadrant(first, second);
  if (!quadrant) return null;
  const change = second.cost / first.cost - 1;
  return (
    <p className="lede">
      From the first half to the second, the pace{" "}
      {second.pace > first.pace ? "slowed" : "quickened"} from <strong>{ratio(first.pace)}</strong>{" "}
      to <strong>{ratio(second.pace)}</strong> the plan while the heart rate{" "}
      {second.bpm > first.bpm ? "rose" : "fell"} from <strong>{bpm(first.bpm)}</strong> to{" "}
      <strong>{bpm(second.bpm)}</strong> bpm
      {quadrant !== "steady" && (
        <>
          : <strong>{HEART_VERDICTS[quadrant]}</strong>
        </>
      )}
      . Each planned minute cost{" "}
      {Math.abs(change) < 0.05
        ? "about as many heartbeats"
        : `${Math.abs(Math.round(change * 100))}% ${change > 0 ? "more" : "fewer"} heartbeats`}
      .
    </p>
  );
}

/** A line's path, as a share of the first half, broken where the series is. */
function linePath(series, key, scaleX, scaleY) {
  // why: monotone, as the gap: a spline would overshoot between points and draw a value
  // never reached.
  return d3Line()
    .defined((point) => point[key] != null)
    .x((point) => scaleX(point.distance_m))
    .y((point) => scaleY(point[key]))
    .curve(curveMonotoneX)(series);
}

// The heart rate and the pace along the route, each against its first half: where one rises
// as the other falls, the plan cost more (or fewer) heartbeats, and which line moved says why.
// The plan takes the terrain out of the pace, so a climb doesn't read as a slowdown.
const StoryHeart = memo(function StoryHeart({ className }) {
  const report = useStore((state) => state.report);
  const distance_m_max = report.totals.distance_m_planned;
  const [cursor_m, cursorHandlers] = useDistanceCursor(distance_m_max);

  const chart = useMemo(() => {
    const spans = sectionSpans(report);
    const halves = heartHalves(spans, distance_m_max);
    const [first] = halves;
    if (!first) return null;
    const series = heartPaceSeries(report).map((point) => ({
      ...point,
      heart: point.bpm == null ? null : point.bpm / first.bpm - 1,
      slower: point.pace == null ? null : point.pace / first.pace - 1,
    }));
    const values = series.flatMap((point) => [point.heart, point.slower]).filter((v) => v != null);
    if (values.length < 4) return null;
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const pad = (max - min || 0.1) * 0.1;
    const scaleX = createXScale({ min: 0, max: distance_m_max }, { min: 0, max: WIDTH });
    const scaleY = createYScale({ min: min - pad, max: max + pad }, { min: HEIGHT, max: 0 });
    const checkpoints = report.checkpoints.slice(1, -1).map((checkpoint) => {
      const x = scaleX(checkpoint.distance_m);
      return { x, pct: (x / WIDTH) * 100, name: checkpoint.name };
    });
    return {
      series,
      halves,
      min,
      max,
      scaleX,
      scaleY,
      heartPath: linePath(series, "heart", scaleX, scaleY),
      pacePath: linePath(series, "slower", scaleX, scaleY),
      checkpoints,
      spans,
      deviations: deviationSpans(report),
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

  const { series, halves, min, max, scaleX, scaleY, heartPath, pacePath } = chart;
  const { checkpoints, spans, deviations } = chart;
  const detour =
    cursor_m == null || !isOffTrace(deviations, cursor_m)
      ? null
      : deviations.find((span) => cursor_m > span.start_m && cursor_m < span.end_m);
  const shown = cursor_m == null ? null : profileAt(series, cursor_m);
  const section =
    cursor_m == null
      ? null
      : spans.find((span) => cursor_m >= span.start_m && cursor_m <= span.end_m);
  const zeroY = scaleY(0);
  const top = (value) => `${((scaleY(value) + VPAD) / (HEIGHT + VPAD * 2)) * 100}%`;

  return (
    <div className={className}>
      <StorySection eyebrow="The heart" title="Heart rate">
        <Lede halves={halves} />
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
                  <>
                    <span>
                      <b>{bpm(shown.bpm)}</b> bpm ({percent(shown.heart)})
                    </span>
                    <span>
                      pace <b>{ratio(shown.pace)}</b> ({percent(shown.slower)})
                    </span>
                    <span>
                      <b>{Math.round(shown.cost)}</b> beats / planned min
                    </span>
                  </>
                )}
                {section && (
                  <span>
                    {section.from} → {section.to}
                  </span>
                )}
              </>
            ) : (
              <span>Point along the route for the heart rate and the pace there.</span>
            )}
          </div>

          <div className="plot" {...cursorHandlers}>
            <svg
              role="img"
              aria-label={`Heart rate and pace against plan along the route, over 10 km, each against the first half: from ${percent(min)} to ${percent(max)}.`}
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
              <line className="zero-line" x1={0} x2={WIDTH} y1={zeroY} y2={zeroY} />
              <path className="pace-line" d={pacePath} />
              <path className="heart-line" d={heartPath} />
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
              {percent(max)}
            </span>
            <span className="plot-label" style={{ bottom: 0 }}>
              {percent(min)}
            </span>
            <span className="plot-label zero-label" style={{ top: top(0) }}>
              first half
            </span>
            {shown?.heart != null && (
              <>
                <span
                  className="cursor-dot pace-dot"
                  style={{
                    left: `${(scaleX(shown.distance_m) / WIDTH) * 100}%`,
                    top: top(shown.slower),
                  }}
                />
                <span
                  className="cursor-dot"
                  style={{
                    left: `${(scaleX(shown.distance_m) / WIDTH) * 100}%`,
                    top: top(shown.heart),
                  }}
                />
              </>
            )}
          </div>

          <AxisNames markers={checkpoints} />
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch heart-swatch" />
              heart rate
            </span>
            <span className="legend-item">
              <span className="legend-swatch pace-swatch" />
              pace against plan (up: slower)
            </span>
            {deviations.length > 0 && (
              <span className="legend-item">
                <span className="legend-swatch deviation-swatch" />
                off the planned trace
              </span>
            )}
          </div>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryHeart);
