import { memo, useMemo } from "react";

import useStore from "../../../store/store.js";
import { formatDelta } from "../../../utils/format.js";
import { timeBudget, toneOf } from "../debrief.js";
import StorySection from "../StorySection.jsx";
import style from "./StoryBudget.style.js";

const PARTS = [
  { key: "moving_s", label: "Moving", className: "moving" },
  { key: "stop_s", label: "Stops", className: "stop" },
];

// Lays a row's parts out from the zero line: time lost stacks right, time gained left.
function segments(row, zeroPct, pctPerSecond) {
  let right = zeroPct;
  let left = zeroPct;
  return PARTS.filter((part) => row[part.key] !== 0).map((part) => {
    const width = Math.abs(row[part.key]) * pctPerSecond;
    if (row[part.key] > 0) {
      right += width;
      return { ...part, left: right - width, width };
    }
    left -= width;
    return { ...part, left, width };
  });
}

// why: diverging bars (left = gained, right = lost) rather than a cumulative waterfall:
// the gap curve above is already the cumulative view, so this one answers "which section,
// and was it the running or the stopping?", which the curve can't split apart.
const StoryBudget = memo(function StoryBudget({ className }) {
  const report = useStore((state) => state.report);

  const budget = useMemo(() => {
    const { rows, ...totals } = timeBudget(report);
    const sum = (row, sign) =>
      PARTS.reduce((total, part) => total + Math.max(0, sign * row[part.key]), 0);
    const lostMax = Math.max(0, ...rows.map((row) => sum(row, 1)));
    const gainedMax = Math.max(0, ...rows.map((row) => sum(row, -1)));
    const span = lostMax + gainedMax || 1;
    const zeroPct = (gainedMax / span) * 100;
    return {
      totals,
      zeroPct,
      rows: rows.map((row) => ({ ...row, segments: segments(row, zeroPct, 100 / span) })),
    };
  }, [report]);

  const { totals, zeroPct, rows } = budget;
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
          <ol className="row-list" data-testid="budget">
            {rows.map((row, index) => (
              <li key={index} className="row">
                <span className="row-label" title={`${row.from} → ${row.to}`}>
                  → {row.to}
                </span>
                <span className="row-track budget-track">
                  <span className="row-zero" style={{ left: `${zeroPct}%` }} />
                  {row.segments.map((segment) => (
                    <span
                      key={segment.key}
                      className={`budget-fill ${segment.className}`}
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
            {PARTS.map((part) => (
              <span key={part.key} className="legend-item">
                <span className={`legend-swatch budget-fill ${part.className}`} />
                {part.label}
              </span>
            ))}
            <span className="legend-item">left of the line: gained · right: lost</span>
          </div>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryBudget);
