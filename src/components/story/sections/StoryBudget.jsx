import { memo, useMemo } from "react";

import useStore from "../../../store/store.js";
import { formatDelta, formatTick } from "../../../utils/format.js";
import { timeBudget, timeTicks, toneOf } from "../debrief.js";
import StorySection from "../StorySection.jsx";
import style from "./StoryBudget.style.js";

const PARTS = [
  { key: "moving_s", label: "Moving", className: "moving" },
  { key: "stop_s", label: "Stops", className: "stop" },
];

// Lays a row's parts out from the zero line: time lost stacks right, time gained left.
// Each part carries its tone, so lost and gained read in the story's behind/ahead colours.
function segments(row, zeroPct, pctPerSecond) {
  let right = zeroPct;
  let left = zeroPct;
  return PARTS.filter((part) => row[part.key] !== 0).map((part) => {
    const width = Math.abs(row[part.key]) * pctPerSecond;
    if (row[part.key] > 0) {
      right += width;
      return { ...part, tone: "behind", left: right - width, width };
    }
    left -= width;
    return { ...part, tone: "ahead", left, width };
  });
}

// why: diverging bars (left = gained, right = lost) rather than a cumulative waterfall:
// the gap curve above is already the cumulative view, so this one answers "which section,
// and was it the running or the stopping?", which the curve can't split apart.
// why: colour says lost or gained, as everywhere in the story; moving vs stopping is solid vs
// striped, so a third hue never competes with the behind/ahead pair.
const StoryBudget = memo(function StoryBudget({ className }) {
  const report = useStore((state) => state.report);
  const cursor_m = useStore((state) => state.cursor_m);
  const setCursor = useStore((state) => state.setCursor);

  const budget = useMemo(() => {
    const { rows, ...totals } = timeBudget(report);
    const sum = (row, sign) =>
      PARTS.reduce((total, part) => total + Math.max(0, sign * row[part.key]), 0);
    const lostMax = Math.max(0, ...rows.map((row) => sum(row, 1)));
    const gainedMax = Math.max(0, ...rows.map((row) => sum(row, -1)));
    const span = lostMax + gainedMax || 1;
    const zeroPct = (gainedMax / span) * 100;
    const pct = (seconds) => zeroPct + (seconds / span) * 100;
    return {
      totals,
      ticks: timeTicks(-gainedMax, lostMax).map((seconds) => ({ seconds, pct: pct(seconds) })),
      rows: rows.map((row) => ({ ...row, segments: segments(row, zeroPct, 100 / span) })),
    };
  }, [report]);

  const { totals, ticks, rows } = budget;
  const isActive = (row) => cursor_m != null && cursor_m >= row.start_m && cursor_m <= row.end_m;
  const verb = (seconds) => (seconds > 0 ? "lost" : "gained");

  return (
    <div className={className}>
      <StorySection eyebrow="The time" title="Where it went">
        <p className="lede">
          <strong>{formatDelta(totals.total_s)}</strong> over the sections:{" "}
          <strong>{formatDelta(totals.moving_s)}</strong> {verb(totals.moving_s)} moving,{" "}
          <strong>{formatDelta(totals.stop_s)}</strong> {verb(totals.stop_s)} stopping.
        </p>
        <div className="chart-frame">
          <div className="row axis-row" aria-hidden="true">
            <span className="row-label" />
            <span className="row-track">
              {ticks.map((tick) => (
                <span key={tick.seconds} className="tick-label" style={{ left: `${tick.pct}%` }}>
                  {formatTick(tick.seconds)}
                </span>
              ))}
            </span>
            <span className="row-value" />
          </div>
          <ol className="row-list" data-testid="budget">
            {rows.map((row, index) => (
              <li
                key={index}
                className={isActive(row) ? "row active" : "row"}
                onPointerEnter={() => setCursor((row.start_m + row.end_m) / 2)}
                onPointerLeave={() => setCursor(null)}
              >
                <span className="row-label" title={`${row.from} → ${row.to}`}>
                  → {row.to}
                </span>
                <span className="row-track">
                  {ticks.map((tick) => (
                    <span
                      key={tick.seconds}
                      className={tick.seconds === 0 ? "row-zero" : "tick-line"}
                      style={{ left: `${tick.pct}%` }}
                    />
                  ))}
                  {row.segments.map((segment) => (
                    <span
                      key={segment.key}
                      className={`budget-fill ${segment.className}`}
                      data-tone={segment.tone}
                      style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
                      title={`${segment.label} ${formatDelta(row[segment.key])}`}
                    />
                  ))}
                </span>
                <span className="row-value" data-tone={toneOf(row.total_s)}>
                  {formatDelta(row.total_s)}
                </span>
              </li>
            ))}
          </ol>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch budget-fill moving" data-tone="behind" /> lost
            </span>
            <span className="legend-item">
              <span className="legend-swatch budget-fill moving" data-tone="ahead" /> gained
            </span>
            <span className="legend-item">
              <span className="legend-swatch budget-fill moving" /> moving
            </span>
            <span className="legend-item">
              <span className="legend-swatch budget-fill stop" /> stops
            </span>
          </div>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryBudget);
