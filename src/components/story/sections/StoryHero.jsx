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
      {label}
    </a>
  );
}

// Where the delta came from, as a waterfall: each step a bar from where the last one ended,
// lost time right and gained time left, then the total from zero.
// why: the race's headline is a sum (lost going down, given back going up, the rest, the
// stops); a waterfall shows a sum at a glance, where sentences make the reader add it up.
function Waterfall({ steps, total_s }) {
  const ends = steps.flatMap((step) => [step.start, step.start + step.seconds]);
  const min = Math.min(0, total_s, ...ends);
  const max = Math.max(0, total_s, ...ends);
  const span = max - min || 1;
  const pct = (seconds) => ((seconds - min) / span) * 100;
  const bar = (from, to) => ({
    left: `${pct(Math.min(from, to))}%`,
    width: `${Math.abs(pct(to) - pct(from))}%`,
  });
  return (
    <ol className="waterfall" data-testid="waterfall">
      {steps.map((step) => (
        <li key={step.key} className="step">
          <More id={step.id} label={step.label} />
          <span className="step-track" aria-hidden="true">
            <span className="step-zero" style={{ left: `${pct(0)}%` }} />
            <span
              className="step-bar"
              data-tone={toneOf(step.seconds)}
              style={bar(step.start, step.start + step.seconds)}
            />
          </span>
          <span className="step-value" data-tone={toneOf(step.seconds)}>
            {formatDelta(step.seconds)}
          </span>
        </li>
      ))}
      <li className="step step-total">
        <More id="gap" label="vs plan" />
        <span className="step-track" aria-hidden="true">
          <span className="step-zero" style={{ left: `${pct(0)}%` }} />
          <span className="step-bar" data-tone={toneOf(total_s)} style={bar(0, total_s)} />
        </span>
        <span className="step-value" data-tone={toneOf(total_s)}>
          {formatDelta(total_s)}
        </span>
      </li>
    </ol>
  );
}

/**
 * The story in short, before its sections: where the delta came from, then the pace, the
 * night and what to plan next time, each linked to the section that tells it in full.
 */
function InShort({ report }) {
  const { steps, fade, night, next } = takeaways(report);
  const facts = [];
  if (fade) {
    facts.push(
      <li key="fade">
        Pace <strong>{times(fade.first)}</strong> → <strong>{times(fade.second)}</strong> the plan
        by half
        {fade.slowest && (
          <>
            ; slowest into {fade.slowest.to}, <strong>{times(fade.slowest.pace_ratio)}</strong>
          </>
        )}
        . <More id="pace" label="Pace" />
      </li>,
    );
  }
  if (night) {
    facts.push(
      <li key="night">
        {Math.abs(night.night - night.day) < 0.05 ? (
          <>
            No slower in the dark: <strong>{times(night.night)}</strong> the plan, night and day.
          </>
        ) : (
          <>
            <strong>{times(night.night)}</strong> the plan in the dark,{" "}
            <strong>{times(night.day)}</strong> by day.
          </>
        )}{" "}
        <More id="gap" label="Gap" />
      </li>,
    );
  }
  if (next) {
    facts.push(
      <li key="next">
        Next time: <strong>{formatPace(next.pace_base_s_per_km)}</strong>, fade{" "}
        <strong>{next.fatigue_coefficient.toFixed(4)}</strong>, within{" "}
        <strong>{formatDuration(next.error_s_rms_replanned)}</strong> on average.{" "}
        <More id="calibration" label="Next time" />
      </li>,
    );
  }
  if (!steps && !facts.length) return null;
  return (
    <section className="in-short" aria-label="In short" data-testid="in-short">
      <span className="in-short-title">In short: where the time went</span>
      {steps && <Waterfall {...steps} />}
      {facts.length > 0 && <ul className="facts">{facts}</ul>}
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
