import { memo } from "react";

import useStore from "../../../store/store.js";
import {
  formatClock,
  formatDay,
  formatDelta,
  formatDuration,
  formatKm,
  formatUtcOffset,
} from "../../../utils/format.js";
import { toneOf } from "../debrief.js";
import style from "./StoryHero.style.js";

// When it was run, on the race's clock: the start's day, then the start and finish times.
function When({ totals }) {
  const offset = totals.utc_offset_s;
  const start = totals.epoch_s_start_actual;
  const finish = totals.duration_s_actual == null ? null : start + totals.duration_s_actual;
  return (
    <p className="when" data-testid="hero-when">
      {formatDay(start, offset)}, started {formatClock(start, offset).slice(4)}
      {finish != null && <>, finished {formatClock(finish, offset)}</>} · {formatUtcOffset(offset)}
    </p>
  );
}

function Stat({ value, label, tone, testId }) {
  return (
    <div className="stat">
      <span className="stat-value" data-tone={tone} data-testid={testId}>
        {value}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

const StoryHero = memo(function StoryHero({ className }) {
  const report = useStore((state) => state.report);
  const { totals } = report;
  const deltaS =
    totals.duration_s_actual == null ? null : totals.duration_s_actual - totals.duration_s_planned;

  return (
    <header className={className}>
      <span className="eyebrow">Plan vs actual</span>
      <h2 className="name">{report.name ?? "Unnamed route"}</h2>
      <When totals={totals} />

      <div className="stat-row stat-row--primary">
        <Stat
          value={formatDuration(totals.duration_s_actual)}
          label={totals.finished ? "finish" : "did not finish"}
          testId="total-actual"
        />
        <Stat
          value={formatDelta(deltaS)}
          label="vs plan"
          tone={toneOf(deltaS)}
          testId="total-delta"
        />
        <Stat value={formatDuration(totals.duration_s_planned)} label="planned" />
      </div>

      <div className="stat-row">
        <Stat
          value={(totals.distance_m_reached / 1000).toFixed(1)}
          label={totals.finished ? "km" : `of ${formatKm(totals.distance_m_planned)}`}
        />
        <Stat value={`+${Math.round(totals.elevation_gain_m_planned)}`} label="m gain" />
        <Stat value={formatDuration(totals.moving_s_actual)} label="moving" />
        <Stat value={formatDuration(totals.stopped_s_actual)} label="stopped" />
        {totals.distance_m_off_route > 0 && (
          <Stat value={(totals.distance_m_off_route / 1000).toFixed(1)} label="km off route" />
        )}
      </div>
    </header>
  );
});

export default style(StoryHero);
