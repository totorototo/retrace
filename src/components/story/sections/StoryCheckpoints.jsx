import { memo, useId, useMemo, useState } from "react";

import useStore from "../../../store/store.js";
import { formatClock, formatDelta, formatDuration } from "../../../utils/format.js";
import { BADGE_LABELS, marginTier, spareAtDeparture, VISIBLE_ROWS } from "../checkpointRow.js";
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
              {/* The same figure as the row's Spare at departure. */}
              <span className="row-value" data-tone={actual < 0 ? "behind" : undefined}>
                {formatDelta(spareAtDeparture(row) ?? actual)}
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

// One checkpoint as the suite's checkpoint row (design system CheckpointRow): name and km on
// the left; the actual arrival on the race's clock and the cutoff badge on the right; vs plan
// and spare at departure under it. Plan and actual race time and the stop wait behind
// Details.
// why the arrival on the clock: a runner remembers "Fri 23:05" at Pierrefitte, not "18h02".
// The Start shows its time only: its plan and race time are 0 and it has no cutoff.
function CheckpointRow({ checkpoint, offset, isStart }) {
  const [open, setOpen] = useState(false);
  // why useId: aria-controls is a list of ids split on spaces, and names have spaces.
  const detailsId = useId();
  const spare = spareAtDeparture(checkpoint);
  const tier = marginTier(spare);

  return (
    <li className="checkpoint-row">
      <div className="checkpoint-top">
        <div>
          <div className="checkpoint-name">{checkpoint.name}</div>
          <div className="checkpoint-km">{(checkpoint.distance_m / 1000).toFixed(1)} km</div>
        </div>
        <div className="checkpoint-key">
          <span className="checkpoint-time">
            {formatClock(checkpoint.epoch_s_arrival_actual, offset)}
          </span>
          {tier && <span className={`badge tier-${tier}`}>{BADGE_LABELS[tier]}</span>}
        </div>
      </div>
      {!isStart && (
        <>
          <dl className="checkpoint-figures">
            <div>
              <dt>Vs plan</dt>
              <dd data-tone={toneOf(checkpoint.delta_s)}>{formatDelta(checkpoint.delta_s)}</dd>
            </div>
            {spare !== null && (
              <div>
                <dt>Spare at departure</dt>
                <dd data-tone={tier === "over" ? "behind" : undefined}>{formatDuration(spare)}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            className="details-toggle"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide details" : "Details"}
          </button>
          <div id={detailsId} className={`fold${open ? " open" : ""}`} inert={!open}>
            <div className="fold-inner">
              <dl className="checkpoint-details">
                <div>
                  <dt>Plan</dt>
                  <dd>{formatDuration(checkpoint.duration_s_planned)}</dd>
                </div>
                <div>
                  <dt>Actual</dt>
                  <dd>{formatDuration(checkpoint.duration_s_actual)}</dd>
                </div>
                <div>
                  <dt>Stop</dt>
                  <dd>{formatDuration(checkpoint.stop_s_actual)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </>
      )}
    </li>
  );
}

const StoryCheckpoints = memo(function StoryCheckpoints({ className }) {
  const checkpoints = useStore((state) => state.report.checkpoints);
  const offset = useStore((state) => state.report.totals.utc_offset_s);
  const [showAll, setShowAll] = useState(false);

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

  const hidden = showAll ? 0 : Math.max(0, checkpoints.length - VISIBLE_ROWS);
  const shown = hidden > 0 ? checkpoints.slice(0, VISIBLE_ROWS) : checkpoints;

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
            {tightest.epoch_s_cutoff != null && (
              <> (cutoff {formatClock(tightest.epoch_s_cutoff, offset)})</>
            )}
            {tightest.margin_s_planned != null && (
              <>, where the plan had {formatDuration(tightest.margin_s_planned)}</>
            )}
            .
          </p>
        )}
        {/* why both: the chart compares the plan's buffer with the race's at a glance, the
            rows give each checkpoint's figures (the design system's checkpoint row). */}
        <Buffers checkpoints={checkpoints} />
        <ol className="checkpoint-list" data-testid="checkpoints">
          {shown.map((checkpoint, index) => (
            <CheckpointRow
              key={`${checkpoint.name}-${index}`}
              checkpoint={checkpoint}
              offset={offset}
              isStart={index === 0}
            />
          ))}
        </ol>
        {hidden > 0 && (
          <button type="button" className="show-more" onClick={() => setShowAll(true)}>
            Show {hidden} more
          </button>
        )}
      </StorySection>
    </div>
  );
});

export default style(StoryCheckpoints);
