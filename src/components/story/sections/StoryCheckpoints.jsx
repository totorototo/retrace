import { memo, useMemo } from "react";

import useStore from "../../../store/store.js";
import { formatDelta, formatDuration } from "../../../utils/format.js";
import { toneOf } from "../debrief.js";
import StorySection from "../StorySection.jsx";
import style from "./StoryCheckpoints.style.js";

// The cutoff buffer at each checkpoint with a cutoff: planned (ring) against actual (dot),
// the cutoff itself the zero line. Below zero, it was missed.
function Buffers({ checkpoints }) {
  const rows = checkpoints.filter(
    (checkpoint) => checkpoint.margin_s_planned != null || checkpoint.margin_s_actual != null,
  );
  if (!rows.length) return null;

  const margins = rows.flatMap((row) => [row.margin_s_planned ?? 0, row.margin_s_actual ?? 0]);
  const min = Math.min(0, ...margins);
  const span = Math.max(0, ...margins) - min || 1;
  const pct = (seconds) => ((seconds - min) / span) * 100;

  return (
    <div className="chart-frame">
      <ol className="row-list" data-testid="buffers">
        {rows.map((row, index) => {
          const planned = row.margin_s_planned;
          const actual = row.margin_s_actual;
          const both = planned != null && actual != null;
          return (
            <li key={index} className="row">
              <span className="row-label">{row.name}</span>
              <span className="row-track">
                <span className="row-zero" style={{ left: `${pct(0)}%` }} />
                {both && (
                  <span
                    className="dumbbell-link"
                    style={{
                      left: `${pct(Math.min(planned, actual))}%`,
                      width: `${Math.abs(pct(planned) - pct(actual))}%`,
                    }}
                  />
                )}
                {planned != null && (
                  <span className="dumbbell-mark planned" style={{ left: `${pct(planned)}%` }} />
                )}
                {actual != null && (
                  <span
                    className="dumbbell-mark actual"
                    data-tone={actual < 0 ? "behind" : undefined}
                    style={{ left: `${pct(actual)}%` }}
                  />
                )}
              </span>
              <span className="row-value" data-tone={actual < 0 ? "behind" : undefined}>
                {formatDelta(actual)}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch dumbbell-mark planned" /> planned buffer
        </span>
        <span className="legend-item">
          <span className="legend-swatch dumbbell-mark actual" /> actual
        </span>
        <span className="legend-item">line: the cutoff</span>
      </div>
    </div>
  );
}

const StoryCheckpoints = memo(function StoryCheckpoints({ className }) {
  const checkpoints = useStore((state) => state.report.checkpoints);

  const tightest = useMemo(
    () =>
      checkpoints.reduce(
        (best, checkpoint) =>
          checkpoint.margin_s_actual != null &&
          (best == null || checkpoint.margin_s_actual < best.margin_s_actual)
            ? checkpoint
            : best,
        null,
      ),
    [checkpoints],
  );

  return (
    <div className={className}>
      <StorySection eyebrow="The checkpoints" title="Against the cutoffs">
        {tightest && (
          <p className="lede">
            Tightest at {tightest.name}:{" "}
            <strong>
              {tightest.margin_s_actual < 0
                ? `missed by ${formatDuration(-tightest.margin_s_actual)}`
                : `${formatDuration(tightest.margin_s_actual)} to spare`}
            </strong>
            {tightest.margin_s_planned != null && (
              <>, where the plan had {formatDuration(tightest.margin_s_planned)}</>
            )}
            .
          </p>
        )}
        <Buffers checkpoints={checkpoints} />

        <div className="table-wrap">
          <table data-testid="checkpoints">
            <thead>
              <tr>
                <th>Checkpoint</th>
                <th>km</th>
                <th>Plan</th>
                <th>Actual</th>
                <th>Delta</th>
                <th>Stop</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.map((checkpoint, index) => (
                <tr key={`${checkpoint.name}-${index}`}>
                  <td>{checkpoint.name}</td>
                  <td>{(checkpoint.distance_m / 1000).toFixed(1)}</td>
                  <td>{formatDuration(checkpoint.duration_s_planned)}</td>
                  <td>{formatDuration(checkpoint.duration_s_actual)}</td>
                  <td data-tone={toneOf(checkpoint.delta_s)}>{formatDelta(checkpoint.delta_s)}</td>
                  <td>{formatDuration(checkpoint.stop_s_actual)}</td>
                  <td>{formatDelta(checkpoint.margin_s_actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryCheckpoints);
