import { line as d3Line } from "d3-shape";
import { memo, useMemo } from "react";

import { createXScale, createYScale } from "../../../helpers/d3.js";
import { useDistanceCursor } from "../../../hooks/useDistanceCursor.js";
import useStore from "../../../store/store.js";
import { formatDelta, formatDuration, formatPace } from "../../../utils/format.js";
import { calibrationErrors, profileAt, stopAverages } from "../debrief.js";
import StorySection from "../StorySection.jsx";
import AxisNames from "./AxisNames.jsx";
import style from "./StoryCalibration.style.js";

const WIDTH = 300;
const HEIGHT = 110;
const VPAD = 6;

const fatigue = (value) => value.toFixed(4);
const stop = (seconds) => (seconds == null ? "–" : formatDuration(seconds));

function Lede({ calibration, settings, errors, finished, finish_s }) {
  const faster = calibration.pace_base_s_per_km < settings.pace_base_s_per_km;
  const harder = calibration.fatigue_coefficient > settings.fatigue_coefficient;
  // "but" where the two pull apart (quicker legs, steeper fade, or the reverse).
  const joint = faster === harder ? "but" : "and";
  const worst = errors.reduce((a, b) =>
    Math.abs(b.replanned_s) > Math.abs(a.replanned_s) ? b : a,
  );
  const replanned = calibration.duration_s_replanned;
  const left = calibration.sections_off_route;

  return (
    <p className="lede">
      Fitted on {calibration.sections_used} sections
      {left > 0 && ` (${left} left out for running off the trace)`}: a base pace of{" "}
      <strong>{formatPace(calibration.pace_base_s_per_km)}</strong>, {faster ? "faster" : "slower"}{" "}
      than the plan&apos;s {formatPace(settings.pace_base_s_per_km)}, {joint} a fade of{" "}
      <strong>{fatigue(calibration.fatigue_coefficient)}</strong>, {harder ? "steeper" : "gentler"}{" "}
      than {fatigue(settings.fatigue_coefficient)}.{" "}
      {finished && (
        <>
          Rerun with those and the actual stops, the plan finishes in{" "}
          <strong>{formatDuration(replanned.at(-1))}</strong> against {formatDuration(finish_s)}{" "}
          run;{" "}
        </>
      )}
      its worst miss is <strong>{formatDuration(Math.abs(worst.replanned_s))}</strong>, at{" "}
      {worst.name}.
    </p>
  );
}

// The settings the plan was made with, and the ones that would have predicted the race.
function Settings({ calibration, settings, checkpoints }) {
  const planned = stopAverages(checkpoints, "stop_s_planned");
  const rows = [
    [
      "Base pace",
      formatPace(settings.pace_base_s_per_km),
      formatPace(calibration.pace_base_s_per_km),
    ],
    ["Fatigue", fatigue(settings.fatigue_coefficient), fatigue(calibration.fatigue_coefficient)],
    ["LifeBase stop", stop(planned.life_base_s), stop(calibration.life_base_stop_s)],
    ["Other stops", stop(planned.other_s), stop(calibration.checkpoint_stop_s)],
  ];
  return (
    <table className="settings" data-testid="calibration-settings">
      <thead>
        <tr>
          <th scope="col">Setting</th>
          <th scope="col">Plan</th>
          <th scope="col">Fitted</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, plan, fitted]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{plan}</td>
            <td>{fitted}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ErrorChart({ report, errors }) {
  const calibration = report.calibration;
  const distance_m_max = report.totals.distance_m_planned;
  const [cursor_m, cursorHandlers] = useDistanceCursor(distance_m_max);

  const chart = useMemo(() => {
    const values = errors.flatMap((error) => [error.planned_s, error.replanned_s]);
    // A spread, not a loop: a few dozen checkpoints at most, never a track's thousands.
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const pad = (max - min || 60) * 0.1;
    const scaleX = createXScale({ min: 0, max: distance_m_max }, { min: 0, max: WIDTH });
    const scaleY = createYScale({ min: min - pad, max: max + pad }, { min: HEIGHT, max: 0 });
    // why: straight, not curved: the errors are known at the checkpoints only, and a curve
    // would draw values between them that nothing measured.
    const path = (key) =>
      d3Line()
        .x((error) => scaleX(error.distance_m))
        .y((error) => scaleY(error[key]))(errors);
    const names = errors.slice(1, -1).map((error) => ({
      x: scaleX(error.distance_m),
      pct: (scaleX(error.distance_m) / WIDTH) * 100,
      name: error.name,
    }));
    return {
      min,
      max,
      scaleX,
      scaleY,
      names,
      plannedPath: path("planned_s"),
      replannedPath: path("replanned_s"),
    };
  }, [errors, distance_m_max]);

  const { min, max, scaleX, scaleY, names, plannedPath, replannedPath } = chart;
  const shown = cursor_m == null ? null : profileAt(errors, cursor_m);

  return (
    <div className="chart-frame">
      <div className="readout" data-testid="calibration-readout">
        {shown ? (
          <>
            <span>
              <b>{shown.name}</b>
            </span>
            <span>
              plan <b>{formatDelta(shown.planned_s)}</b>
            </span>
            <span>
              fitted <b>{formatDelta(shown.replanned_s)}</b>
            </span>
          </>
        ) : (
          <>
            <span>
              off by <b>{formatDuration(calibration.error_s_rms_planned)}</b> →{" "}
              <b>{formatDuration(calibration.error_s_rms_replanned)}</b> on average (rms)
            </span>
            <span>
              <b>{formatDuration(calibration.error_s_max_planned)}</b> →{" "}
              <b>{formatDuration(calibration.error_s_max_replanned)}</b> at worst
            </span>
          </>
        )}
      </div>

      <div className="plot" {...cursorHandlers}>
        <svg
          role="img"
          aria-label={`Race time against each plan at the checkpoints: the plan off by up to ${formatDuration(calibration.error_s_max_planned)}, the fitted one by up to ${formatDuration(calibration.error_s_max_replanned)}.`}
          viewBox={`0 -${VPAD} ${WIDTH} ${HEIGHT + VPAD * 2}`}
          preserveAspectRatio="none"
          width="100%"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT + VPAD * 2}` }}
        >
          {names.map((name, index) => (
            <line
              key={index}
              className="checkpoint-line"
              x1={name.x}
              x2={name.x}
              y1={-VPAD}
              y2={HEIGHT + VPAD}
            />
          ))}
          <line className="zero-line" x1={0} x2={WIDTH} y1={scaleY(0)} y2={scaleY(0)} />
          <path className="error-line planned" d={plannedPath} />
          <path className="error-line replanned" d={replannedPath} />
          {shown && (
            <line
              className="cursor-line"
              x1={scaleX(shown.distance_m)}
              x2={scaleX(shown.distance_m)}
              y1={-VPAD}
              y2={HEIGHT + VPAD}
            />
          )}
        </svg>
        <span className="plot-label" style={{ top: 0 }}>
          {formatDelta(max)} slower
        </span>
        {min < 0 && (
          <span className="plot-label" style={{ bottom: 0 }}>
            {formatDelta(min)} faster
          </span>
        )}
        {/* HTML dots at the checkpoints: circles in the stretched viewBox would be ellipses. */}
        {errors.map((error, index) =>
          ["planned_s", "replanned_s"].map((key) => (
            <span
              key={`${index}-${key}`}
              className={`error-dot ${key === "planned_s" ? "planned" : "replanned"}${shown === error ? " active" : ""}`}
              style={{
                left: `${(scaleX(error.distance_m) / WIDTH) * 100}%`,
                top: `${((scaleY(error[key]) + VPAD) / (HEIGHT + VPAD * 2)) * 100}%`,
              }}
            />
          )),
        )}
      </div>

      <AxisNames markers={names} />
      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch planned-swatch" />
          the plan
        </span>
        <span className="legend-item">
          <span className="legend-swatch replanned-swatch" />
          rerun with the fitted settings
        </span>
      </div>
    </div>
  );
}

// debriefz's calibration: the settings that would have predicted the race, and how much
// closer the plan rerun with them comes. why: last in the story, as the CLI prints it: the
// story's conclusion is what to plan with next time.
const StoryCalibration = memo(function StoryCalibration({ className }) {
  const report = useStore((state) => state.report);
  const { calibration, settings, checkpoints, totals } = report;
  const errors = useMemo(() => calibrationErrors(report), [report]);

  return (
    <div className={className}>
      <StorySection eyebrow="Next time" title="The plan that fits">
        {calibration && errors.length >= 2 ? (
          <>
            <Lede
              calibration={calibration}
              settings={settings}
              errors={errors}
              finished={totals.finished}
              finish_s={totals.duration_s_actual}
            />
            <ErrorChart report={report} errors={errors} />
            <Settings calibration={calibration} settings={settings} checkpoints={checkpoints} />
          </>
        ) : (
          <p className="lede" data-testid="calibration-none">
            Not enough of the race to fit settings to: it takes three sections or more of at least
            10 min moving, run on the planned trace.
          </p>
        )}
      </StorySection>
    </div>
  );
});

export default style(StoryCalibration);
