import { memo, useMemo, useState } from "react";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { useDistanceCursor } from "../../../hooks/useDistanceCursor.js";
import useStore from "../../../store/store.js";
import { formatDuration } from "../../../utils/format.js";
import { paceHalves, sectionSpans, stageSpans, toneOfRatio } from "../debrief.js";
import { nightSpans } from "../night.js";
import StorySection from "../StorySection.jsx";
import AxisNames from "./AxisNames.jsx";
import NightBands from "./NightBands.jsx";
import style from "./StoryPace.style.js";

const WIDTH = 300;
const HEIGHT = 110;
const VPAD = 6;

const ratio = (value) => (value == null ? "–" : `${value.toFixed(2)}×`);

// The two grains the chart draws: debriefz's sections, or its stages (between LifeBases).
const LEVELS = {
  sections: { label: "Sections", title: "Section by section", spans: sectionSpans },
  stages: { label: "Stages", title: "Stage by stage", spans: stageSpans },
};

// why: bars as wide as their section or stage (a Marimekko) rather than equal-width: a 21 km section
// at 1.17× costs far more than a 6 km one at 1.67×, and area is what the eye compares.
const StoryPace = memo(function StoryPace({ className }) {
  const report = useStore((state) => state.report);
  const distance_m_max = report.totals.distance_m_planned;
  const [cursor_m, cursorHandlers] = useDistanceCursor(distance_m_max);
  const [level, setLevel] = useState("sections");
  // why: no switch for a single stage (a race without LifeBases): one bar is the whole race.
  const hasStages = (report.stages?.length ?? 0) >= 2;
  const shownLevel = hasStages ? level : "sections";

  const chart = useMemo(() => {
    const spans = LEVELS[shownLevel].spans(report);
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

    // The boundaries between the bars: every checkpoint, or only the LifeBases.
    const names = spans.slice(1).map((span) => ({
      pct: (scaleX(span.start_m) / WIDTH) * 100,
      name: span.from,
    }));

    // The halves from the sections whatever the grain: a stage is too coarse to split by.
    const halves = paceHalves(sectionSpans(report), distance_m_max);
    return { spans, bars, names, min, max, oneY, halves, scaleX };
  }, [report, distance_m_max, shownLevel]);

  const { spans, bars, names, min, max, oneY, halves, scaleX } = chart;
  const night = nightSpans(report);
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
      <StorySection eyebrow="The pace" title={LEVELS[shownLevel].title}>
        <p className="lede">
          Moving time against the plan, stops left out. First half{" "}
          <strong>{ratio(halves[0])}</strong>, second half <strong>{ratio(halves[1])}</strong>
          {slowest && (
            <>
              ; slowest {shownLevel === "stages" ? "stage" : "section"} into {slowest.to} at{" "}
              <strong>{ratio(slowest.pace_ratio)}</strong>
            </>
          )}
          .
        </p>
        <div className="chart-frame">
          {hasStages && (
            <div className="level-switch" role="radiogroup" aria-label="Pace by">
              {Object.entries(LEVELS).map(([key, { label }]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={key === shownLevel}
                  className={key === shownLevel ? "level active" : "level"}
                  onClick={() => setLevel(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
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
              <span>Point at a {shownLevel === "stages" ? "stage" : "section"} for its times.</span>
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
              <NightBands spans={night} scaleX={scaleX} top={-VPAD} height={HEIGHT + VPAD * 2} />
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
          {night.length > 0 && (
            <div className="legend">
              <span className="legend-item">
                <span className="legend-swatch night-swatch" />
                in the dark
              </span>
            </div>
          )}
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryPace);
