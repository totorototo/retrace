import { Fragment, memo, useMemo } from "react";

import { getClimbCategory } from "../../../helpers/climbCategory.js";
import useStore from "../../../store/store.js";
import { formatDelta, formatDuration, formatTick } from "../../../utils/format.js";
import { climbAt, climbHalves, timeTicks, toneOf } from "../debrief.js";
import StorySection from "../StorySection.jsx";
import style from "./StoryClimbs.style.js";

// Speed against the plan: planned over actual time, less one, so +0.16 is 16 % faster.
const percent = (climb) => {
  const speed = climb.duration_s_planned / climb.duration_s_actual - 1;
  return `${speed > 0 ? "+" : speed < 0 ? "−" : ""}${Math.round(Math.abs(speed) * 100)}%`;
};

// Time lost (positive) or gained on a climb; null for one outside the plan or not run.
const deltaOf = (climb) =>
  climb.vam_m_per_h_planned == null || climb.duration_s_actual == null
    ? null
    : climb.duration_s_actual - climb.duration_s_planned;

// One row per climb: its category (Terminus's), where and how much, then the time it cost
// against the plan, lost right and gained left, on the same axis as "Where it went".
// why: minutes, not speed: it answers "where did the climbs cost me?", and a big climb
// weighs by itself, so no size encoding is needed. The speed stays as the row's second value.
const StoryClimbs = memo(function StoryClimbs({ className }) {
  const report = useStore((state) => state.report);
  const cursor_m = useStore((state) => state.cursor_m);
  const setCursor = useStore((state) => state.setCursor);
  const { climbs } = report;
  const distance_m = report.totals.distance_m_planned;

  const chart = useMemo(() => {
    const deltas = climbs.map(deltaOf);
    const known = deltas.filter((delta) => delta != null);
    const min = Math.min(0, ...known);
    const max = Math.max(0, ...known);
    const span = max - min || 1;
    const pct = (seconds) => ((seconds - min) / span) * 100;
    const zero = pct(0);
    const halves = climbHalves(climbs, distance_m);
    return {
      halves,
      total: halves[0] + halves[1],
      ticks: timeTicks(min, max).map((seconds) => ({ seconds, pct: pct(seconds) })),
      rows: climbs.map((climb, index) => {
        const delta = deltas[index];
        return {
          climb,
          delta,
          category: getClimbCategory(climb),
          left: delta == null ? zero : Math.min(zero, pct(delta)),
          width: delta == null ? 0 : Math.abs(pct(delta) - zero),
          secondHalf: climb.distance_m_start + climb.distance_m / 2 >= distance_m / 2,
        };
      }),
    };
  }, [climbs, distance_m]);

  const active = cursor_m == null ? null : climbAt(climbs, cursor_m);

  if (!climbs.length) {
    return (
      <div className={className}>
        <StorySection eyebrow="The climbs" title="Climbs">
          <p className="lede">No significant climbs on this route.</p>
        </StorySection>
      </div>
    );
  }

  const halfway = chart.rows.findIndex((row) => row.secondHalf);
  const verb = (seconds) => (seconds > 0 ? "lost" : "gained");

  return (
    <div className={className}>
      <StorySection eyebrow="The climbs" title={`${climbs.length} climbs`}>
        <p className="lede">
          <strong>{formatDuration(Math.abs(chart.total))}</strong> {verb(chart.total)} on the
          climbs: <strong>{formatDelta(chart.halves[0])}</strong> in the first half,{" "}
          <strong>{formatDelta(chart.halves[1])}</strong> in the second.
        </p>
        <div className="chart-frame">
          <div className="row axis-row" aria-hidden="true">
            <span className="row-label" />
            <span className="row-track">
              {chart.ticks.map((tick) => (
                <span key={tick.seconds} className="tick-label" style={{ left: `${tick.pct}%` }}>
                  {formatTick(tick.seconds)}
                </span>
              ))}
            </span>
            <span className="row-value" />
          </div>
          <ol className="row-list" data-testid="climbs">
            {chart.rows.map((row, index) => {
              const { climb, delta, category } = row;
              const tone = toneOf(delta);
              return (
                <Fragment key={index}>
                  {index === halfway && index > 0 && (
                    <li role="separator" className="halfway">
                      <span>halfway</span>
                    </li>
                  )}
                  <li
                    className={climb === active ? "row active" : "row"}
                    onPointerEnter={() => setCursor(climb.distance_m_start + climb.distance_m / 2)}
                    onPointerLeave={() => setCursor(null)}
                  >
                    <span className="row-label">
                      <span className="climb-category" data-category={category?.key}>
                        {category?.key ?? "·"}
                      </span>
                      km {(climb.distance_m_start / 1000).toFixed(1)} · +
                      {Math.round(climb.elevation_gain_m)} m
                    </span>
                    <span className="row-track">
                      {chart.ticks.map((tick) => (
                        <span
                          key={tick.seconds}
                          className={tick.seconds === 0 ? "row-zero" : "tick-line"}
                          style={{ left: `${tick.pct}%` }}
                        />
                      ))}
                      {delta != null && (
                        <span
                          className="climb-bar"
                          data-tone={tone}
                          style={{ left: `${row.left}%`, width: `${row.width}%` }}
                        />
                      )}
                    </span>
                    <span className="row-value" data-tone={tone}>
                      {delta == null ? "unplanned" : formatTick(Math.round(delta / 60) * 60)}
                      {delta != null && <span className="climb-speed">{percent(climb)}</span>}
                    </span>
                  </li>
                </Fragment>
              );
            })}
          </ol>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch climb-bar" data-tone="behind" /> lost
            </span>
            <span className="legend-item">
              <span className="legend-swatch climb-bar" data-tone="ahead" /> gained
            </span>
            <span className="legend-item">time on the climb · speed vs plan</span>
          </div>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryClimbs);
