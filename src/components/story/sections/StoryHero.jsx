import { memo } from "react";

import useStore from "../../../store/store.js";
import { formatDelta, formatDuration, formatKm } from "../../../utils/format.js";
import { toneOf } from "../debrief.js";
import style from "./StoryHero.style.js";

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
