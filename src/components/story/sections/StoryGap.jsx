import { area as d3Area, curveMonotoneX, line as d3Line } from "d3-shape";
import { memo, useId, useMemo } from "react";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { useDistanceCursor } from "../../../hooks/useDistanceCursor.js";
import useStore from "../../../store/store.js";
import { formatClock, formatDelta, formatDuration } from "../../../utils/format.js";
import { behindFrom, bridges, deviationSpans, gapSeries, profileAt, toneOf } from "../debrief.js";
import { dayNightRatios, nightSpans } from "../night.js";
import StorySection from "../StorySection.jsx";
import AxisNames from "./AxisNames.jsx";
import DeviationBands from "./DeviationBands.jsx";
import NightBands from "./NightBands.jsx";
import style from "./StoryGap.style.js";

const WIDTH = 300;
const HEIGHT = 110;
const VPAD = 6;

const times = (ratio) => `${ratio.toFixed(2)}×`;

// By night against by day, when the race had both: how much harder the dark was than the
// plan assumed (gpxz's plan already slows at night).
function DayNight({ ratios }) {
  if (ratios.night == null || ratios.day == null) return null;
  // Within 5 % of each other (the pace section's "on plan"), one figure says it.
  if (Math.abs(ratios.night - ratios.day) < 0.05) {
    return (
      <>
        {" "}
        In the dark as by day: <strong>{times(ratios.night)}</strong> the planned time.
      </>
    );
  }
  return (
    <>
      {" "}
      In the dark, <strong>{times(ratios.night)}</strong> the planned time; by day,{" "}
      <strong>{times(ratios.day)}</strong>.
    </>
  );
}

function Lede({ points, finished }) {
  const last = points.at(-1);
  const turn = behindFrom(points);
  const at = (point) => `km ${(point.distance_m / 1000).toFixed(0)}`;
  const end = <strong>{formatDelta(last.delta_s)}</strong>;
  const where = finished ? "at the finish" : `at ${at(last)}, the last point reached`;

  if (turn == null) {
    return (
      <>
        On or ahead of the plan {where}: {end}.
      </>
    );
  }
  if (turn === points[0]) {
    return (
      <>
        Behind the plan from the start: {end} {where}.
      </>
    );
  }
  return (
    <>
      On or ahead of the plan until {at(turn)}, then behind for good: {end} {where}.
    </>
  );
}

const StoryGap = memo(function StoryGap({ className }) {
  const report = useStore((state) => state.report);
  const clipId = useId();
  const distance_m_max = report.totals.distance_m_planned;
  const [cursor_m, cursorHandlers] = useDistanceCursor(distance_m_max);

  const chart = useMemo(() => {
    const points = gapSeries(report);
    const deltas = points.map((point) => point.delta_s);
    const min = Math.min(0, ...deltas);
    const max = Math.max(0, ...deltas);
    const pad = (max - min || 60) * 0.1;

    const scaleX = createXScale({ min: 0, max: distance_m_max }, { min: 0, max: WIDTH });
    const scaleY = createYScale({ min: min - pad, max: max + pad }, { min: HEIGHT, max: 0 });
    const zeroY = scaleY(0);

    // why: monotone, not Catmull-Rom as in Terminus: a spline overshoots between points,
    // and here an overshoot across zero would draw time lost that never was.
    const areaPath = d3Area()
      .x((point) => scaleX(point.distance_m))
      .y0(zeroY)
      .y1((point) => scaleY(point.delta_s))
      .curve(curveMonotoneX)(points);
    // The area's top edge, solid: as Terminus draws its accent, where the fill alone reads dull.
    const edgePath = d3Line()
      .x((point) => scaleX(point.distance_m))
      .y((point) => scaleY(point.delta_s))
      .curve(curveMonotoneX)(points);

    const checkpoints = report.checkpoints.slice(1, -1).map((checkpoint) => {
      const x = scaleX(checkpoint.distance_m);
      return { x, pct: (x / WIDTH) * 100, name: checkpoint.name };
    });

    return {
      points,
      bridges: bridges(points).map(({ from, to }) => ({
        x1: scaleX(from.distance_m),
        y1: scaleY(from.delta_s),
        x2: scaleX(to.distance_m),
        y2: scaleY(to.delta_s),
      })),
      min,
      max,
      scaleX,
      scaleY,
      zeroY,
      areaPath,
      edgePath,
      checkpoints,
      deviations: deviationSpans(report),
    };
  }, [report, distance_m_max]);

  const { points, bridges: bridgeLines, min, max, scaleX, scaleY, zeroY, areaPath } = chart;
  const { edgePath, checkpoints, deviations } = chart;
  const night = nightSpans(report);
  const ratios = useMemo(() => dayNightRatios(report, night), [report, night]);
  const { epoch_s_start_actual, utc_offset_s } = report.totals;
  const shown = cursor_m == null ? points.at(-1) : profileAt(points, cursor_m);

  return (
    <div className={className}>
      <StorySection eyebrow="The gap" title="Behind or ahead">
        <p className="lede">
          <Lede points={points} finished={report.totals.finished} />
          <DayNight ratios={ratios} />
        </p>
        <div className="chart-frame">
          <div className="readout" data-testid="gap-readout">
            <span>
              km <b>{(shown.distance_m / 1000).toFixed(1)}</b>
            </span>
            <span>
              plan <b>{formatDuration(shown.duration_s_planned)}</b>
            </span>
            {shown.off_trace ? (
              <>
                <span>off the planned trace</span>
                <span data-tone={toneOf(shown.delta_s)}>
                  ≈ <b>{formatDelta(shown.delta_s)}</b>
                </span>
              </>
            ) : (
              <>
                <span>
                  actual <b>{formatDuration(shown.duration_s_actual)}</b>
                </span>
                <span>
                  at{" "}
                  <b>{formatClock(epoch_s_start_actual + shown.duration_s_actual, utc_offset_s)}</b>
                </span>
                <span data-tone={toneOf(shown.delta_s)}>
                  <b>{formatDelta(shown.delta_s)}</b>
                </span>
              </>
            )}
          </div>

          <div className="plot" {...cursorHandlers}>
            <svg
              role="img"
              aria-label={`Time against the plan along the route, from ${formatDelta(min)} to ${formatDelta(max)}.`}
              viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
              preserveAspectRatio="none"
              width="100%"
              style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
            >
              {/* One area, two colours: clipped above the zero line (behind) and below it. */}
              <defs>
                <clipPath id={`${clipId}-behind`}>
                  <rect x={0} y={-VPAD} width={WIDTH} height={zeroY + VPAD} />
                </clipPath>
                <clipPath id={`${clipId}-ahead`}>
                  <rect x={0} y={zeroY} width={WIDTH} height={HEIGHT + VPAD - zeroY} />
                </clipPath>
              </defs>
              <NightBands spans={night} scaleX={scaleX} top={-VPAD} height={HEIGHT + VPAD * 2} />
              <DeviationBands
                spans={deviations}
                scaleX={scaleX}
                top={-VPAD}
                height={HEIGHT + VPAD * 2}
              />
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
              <path className="gap-area behind" d={areaPath} clipPath={`url(#${clipId}-behind)`} />
              <path className="gap-area ahead" d={areaPath} clipPath={`url(#${clipId}-ahead)`} />
              <path className="gap-edge behind" d={edgePath} clipPath={`url(#${clipId}-behind)`} />
              <path className="gap-edge ahead" d={edgePath} clipPath={`url(#${clipId}-ahead)`} />
              <line className="zero-line" x1={0} x2={WIDTH} y1={zeroY} y2={zeroY} />
              {/* Across a detour only the ends are known: a straight, dashed bridge. */}
              {bridgeLines.map((line, index) => (
                <line key={index} className="bridge-line" {...line} />
              ))}
              {cursor_m != null && (
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
              {formatDelta(max)} behind
            </span>
            {min < 0 && (
              <span className="plot-label" style={{ bottom: 0 }}>
                {formatDelta(min)} ahead
              </span>
            )}
            {cursor_m != null && (
              <span
                className="cursor-dot"
                style={{
                  left: `${(scaleX(shown.distance_m) / WIDTH) * 100}%`,
                  top: `${((scaleY(shown.delta_s) + VPAD) / (HEIGHT + VPAD * 2)) * 100}%`,
                }}
              />
            )}
          </div>

          <AxisNames markers={checkpoints} />
          {(deviations.length > 0 || night.length > 0) && (
            <div className="legend">
              {deviations.length > 0 && (
                <span className="legend-item">
                  <span className="legend-swatch deviation-swatch" />
                  off the planned trace
                </span>
              )}
              {night.length > 0 && (
                <span className="legend-item">
                  <span className="legend-swatch night-swatch" />
                  in the dark
                </span>
              )}
            </div>
          )}
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryGap);
