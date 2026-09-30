import { area as d3Area, line as d3Line } from "d3-shape";
import { memo, useId, useMemo } from "react";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { useDistanceCursor } from "../../../hooks/useDistanceCursor.js";
import useStore from "../../../store/store.js";
import { formatDelta, formatDuration } from "../../../utils/format.js";
import {
  climbAt,
  deviationSpans,
  isOffTrace,
  profileAt,
  sectionSpans,
  toneOf,
  toneOfRatio,
} from "../debrief.js";
import StorySection from "../StorySection.jsx";
import AxisNames from "./AxisNames.jsx";
import DeviationBands from "./DeviationBands.jsx";
import style from "./StoryProfile.style.js";

const WIDTH = 300;
const HEIGHT = 90;
const VPAD = 6;

// Adapted from Terminus's ElevationProfile: the same area under a line, split into one
// filled segment per run (there, day and night; here, sections). Each is drawn a step past
// its ends and clipped to them, so neighbours meet exactly at the checkpoint.
// why: coloured by each section's pace ratio, the tone the Pace section uses, so the
// terrain and how it was run read as one picture: where the red is, and what it climbed.
const StoryProfile = memo(function StoryProfile({ className }) {
  const report = useStore((state) => state.report);
  const distance_m_max = report.totals.distance_m_planned;
  const [cursor_m, cursorHandlers] = useDistanceCursor(distance_m_max);
  const clipId = useId();

  const chart = useMemo(() => {
    const { profile } = report;
    const elevations = profile.map((point) => point.elevation_m);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const pad = (max - min || 100) * 0.1;
    const floor = min - pad;

    const scaleX = createXScale({ min: 0, max: distance_m_max }, { min: 0, max: WIDTH });
    const scaleY = createYScale({ min: floor, max: max + pad }, { min: HEIGHT, max: 0 });
    const x = (point) => scaleX(point.distance_m);
    const y = (point) => scaleY(point.elevation_m);
    const area = d3Area().x(x).y0(scaleY(floor)).y1(y);

    const step_m = profile[1].distance_m - profile[0].distance_m;
    const segments = sectionSpans(report).map((span) => ({
      tone: toneOfRatio(span.pace_ratio),
      x: scaleX(span.start_m),
      width: scaleX(span.end_m) - scaleX(span.start_m),
      path: area(
        profile.filter(
          (point) =>
            point.distance_m >= span.start_m - step_m && point.distance_m <= span.end_m + step_m,
        ),
      ),
    }));

    const checkpoints = report.checkpoints.slice(1, -1).map((checkpoint) => {
      const at = scaleX(checkpoint.distance_m);
      return { x: at, pct: (at / WIDTH) * 100, name: checkpoint.name };
    });

    return {
      min,
      max,
      scaleX,
      scaleY,
      segments,
      checkpoints,
      linePath: d3Line().x(x).y(y)(profile),
      deviations: deviationSpans(report),
    };
  }, [report, distance_m_max]);

  const { min, max, scaleX, scaleY, segments, checkpoints, linePath, deviations } = chart;
  const shown = cursor_m == null ? null : profileAt(report.profile, cursor_m);
  // The climb under the cursor, shaded: pointing at a row in the climbs list lands here.
  const climb = cursor_m == null ? null : climbAt(report.climbs, cursor_m);
  // Inside a detour, the profile's actual time is the rejoin time: not a time at this point.
  const offTrace = shown != null && isOffTrace(deviations, shown.distance_m);
  const deltaS =
    shown?.duration_s_actual == null ? null : shown.duration_s_actual - shown.duration_s_planned;

  return (
    <div className={className}>
      <StorySection eyebrow="The terrain" title="What it climbed">
        <p className="lede">
          <strong>+{Math.round(report.totals.elevation_gain_m_planned)} m</strong> between{" "}
          {Math.round(min)} and {Math.round(max)} m, each section coloured by how it went against
          the plan.
        </p>
        <div className="chart-frame">
          <div className="readout" data-testid="profile-readout">
            {shown ? (
              <>
                <span>
                  km <b>{(shown.distance_m / 1000).toFixed(1)}</b>
                </span>
                <span>
                  <b>{Math.round(shown.elevation_m)}</b> m
                </span>
                {climb && (
                  <span>
                    climb <b>+{Math.round(climb.elevation_gain_m)} m</b> to{" "}
                    {Math.round(climb.elevation_m_summit)} m
                  </span>
                )}
                <span>
                  plan <b>{formatDuration(shown.duration_s_planned)}</b>
                </span>
                {offTrace ? (
                  <span>off the planned trace</span>
                ) : (
                  <>
                    <span>
                      actual <b>{formatDuration(shown.duration_s_actual)}</b>
                    </span>
                    <span data-tone={toneOf(deltaS)}>
                      <b>{formatDelta(deltaS)}</b>
                    </span>
                  </>
                )}
                {!offTrace && shown.heart_rate_bpm_average != null && (
                  <span>
                    HR <b>{Math.round(shown.heart_rate_bpm_average)}</b>
                  </span>
                )}
              </>
            ) : (
              <span>Point along the profile for the times there.</span>
            )}
          </div>

          <div className="plot" {...cursorHandlers}>
            <svg
              role="img"
              aria-label={`Elevation profile from ${Math.round(min)} to ${Math.round(max)} meters, coloured by pace against the plan.`}
              viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
              preserveAspectRatio="none"
              width="100%"
              style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
            >
              <DeviationBands
                spans={deviations}
                scaleX={scaleX}
                top={-VPAD}
                height={HEIGHT + VPAD * 2}
              />
              <defs>
                {segments.map((segment, index) => (
                  <clipPath key={index} id={`${clipId}-${index}`}>
                    <rect
                      x={segment.x}
                      y={-VPAD}
                      width={segment.width}
                      height={HEIGHT + VPAD * 2}
                    />
                  </clipPath>
                ))}
              </defs>
              {climb && (
                <rect
                  className="climb-band"
                  x={scaleX(climb.distance_m_start)}
                  y={-VPAD}
                  width={
                    scaleX(climb.distance_m_start + climb.distance_m) -
                    scaleX(climb.distance_m_start)
                  }
                  height={HEIGHT + VPAD * 2}
                />
              )}
              {segments.map((segment, index) => (
                <path
                  key={index}
                  className="profile-area"
                  data-tone={segment.tone}
                  d={segment.path}
                  clipPath={`url(#${clipId}-${index})`}
                />
              ))}
              <path className="profile-line" d={linePath} />
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
              {Math.round(max)} m
            </span>
            {shown && (
              <span
                className="cursor-dot"
                style={{
                  left: `${(scaleX(shown.distance_m) / WIDTH) * 100}%`,
                  top: `${((scaleY(shown.elevation_m) + VPAD) / (HEIGHT + VPAD * 2)) * 100}%`,
                }}
              />
            )}
          </div>

          <AxisNames markers={checkpoints} />
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch profile-area" data-tone="behind" />
              slower than planned
            </span>
            <span className="legend-item">
              <span className="legend-swatch profile-area" />
              on plan
            </span>
            <span className="legend-item">
              <span className="legend-swatch profile-area" data-tone="ahead" />
              faster
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

export default style(StoryProfile);
