import { memo } from "react";

import useStore from "../../../store/store.js";
import {
  formatClock,
  formatDay,
  formatDelta,
  formatDuration,
  formatKm,
  formatPace,
  formatUtcOffset,
} from "../../../utils/format.js";
import { toneOf } from "../debrief.js";
import { takeaways } from "../takeaways.js";
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

const times = (ratio) => `${ratio.toFixed(2)}×`;

// A takeaway's link to the section that tells it in full.
// why: smooth scrolling by hand, not a bare anchor: the anchor would jump, and add a hash
// to the URL that the next reload would scroll to.
function More({ id, label }) {
  const onClick = (event) => {
    event.preventDefault();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(`story-${id}`)
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  return (
    <a className="more" href={`#story-${id}`} onClick={onClick}>
      {label} →
    </a>
  );
}

/**
 * The story in a few lines, before its sections: where the time went, what the terrain did,
 * how the pace held, the night, and what to plan next time. why: the hero's figures say how
 * far off the race was; these say why, for a reader who stops after one screen.
 */
function InShort({ report }) {
  const { time, terrain, fade, night, next } = takeaways(report);
  const lines = [];
  // Each part by its sign: "cost" when it lost time, "gave back" when it gained some.
  const part = (seconds) =>
    seconds > 0 ? (
      <>
        cost <strong>{formatDelta(seconds)}</strong>
      </>
    ) : (
      <>
        gave back <strong>{formatDuration(-seconds)}</strong>
      </>
    );
  if (time) {
    lines.push(
      <li key="time">
        Moving {time.moving_s > 0 ? "slower" : "faster"} than planned {part(time.moving_s)}; the
        stops {part(time.stop_s)}. <More id="budget" label="Time lost" />
      </li>,
    );
  }
  if (terrain) {
    lines.push(
      <li key="terrain">
        Going down {part(terrain.descents_s)}; going up {part(terrain.climbs_s)}.{" "}
        <More id="climbs" label="Climbs" />
      </li>,
    );
  }
  if (fade) {
    lines.push(
      <li key="fade">
        <strong>{times(fade.first)}</strong> the planned pace in the first half,{" "}
        <strong>{times(fade.second)}</strong> in the second
        {fade.slowest && (
          <>
            ; slowest into {fade.slowest.to} at <strong>{times(fade.slowest.pace_ratio)}</strong>
          </>
        )}
        . <More id="pace" label="Pace" />
      </li>,
    );
  }
  if (night) {
    lines.push(
      <li key="night">
        {Math.abs(night.night - night.day) < 0.05 ? (
          <>
            No slower in the dark than by day: <strong>{times(night.night)}</strong> the planned
            time.
          </>
        ) : (
          <>
            <strong>{times(night.night)}</strong> the planned time in the dark,{" "}
            <strong>{times(night.day)}</strong> by day.
          </>
        )}{" "}
        <More id="gap" label="Gap" />
      </li>,
    );
  }
  if (next) {
    lines.push(
      <li key="next">
        Next time, plan <strong>{formatPace(next.pace_base_s_per_km)}</strong> with a{" "}
        <strong>{next.fatigue_coefficient.toFixed(4)}</strong> fade: it would have called the race
        within <strong>{formatDuration(next.error_s_rms_replanned)}</strong> on average.{" "}
        <More id="calibration" label="Next time" />
      </li>,
    );
  }
  if (!lines.length) return null;
  return (
    <section className="in-short" aria-label="In short" data-testid="in-short">
      <span className="in-short-title">In short</span>
      <ul>{lines}</ul>
    </section>
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
      <InShort report={report} />
    </header>
  );
});

export default style(StoryHero);
