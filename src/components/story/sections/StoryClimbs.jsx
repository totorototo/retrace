import { memo, useMemo } from "react";

import { getClimbCategory } from "../../../helpers/climbCategory.js";
import useStore from "../../../store/store.js";
import { climbAt, climbHalves } from "../debrief.js";
import StorySection from "../StorySection.jsx";
import style from "./StoryClimbs.style.js";

// Actual climbing speed within 5 % of the plan's reads as on plan.
const toneOfVam = (actual, planned) => {
  if (actual == null || planned == null) return undefined;
  const ratio = actual / planned;
  return Math.abs(ratio - 1) < 0.05 ? undefined : ratio > 1 ? "ahead" : "behind";
};

const speed = (ratio) => (ratio == null ? "–" : `${ratio.toFixed(2)}×`);

// One row per climb, as the cutoff buffers: its category (Terminus's), where and how much,
// then climbing speed (VAM, vertical meters per hour) planned as a ring, actual as a dot.
// why: VAM rather than time, so a 1,200 m climb and a 150 m one compare on one scale, and
// the fade shows as dots drifting left of their rings down the list.
const StoryClimbs = memo(function StoryClimbs({ className }) {
  const report = useStore((state) => state.report);
  const cursor_m = useStore((state) => state.cursor_m);
  const setCursor = useStore((state) => state.setCursor);
  const { climbs } = report;

  const scale = useMemo(() => {
    const vams = climbs.flatMap((climb) => [climb.vam_m_per_h_planned, climb.vam_m_per_h_actual]);
    const max = Math.max(1, ...vams.filter((vam) => vam != null));
    return (vam) => (vam / max) * 100;
  }, [climbs]);

  const halves = climbHalves(climbs, report.totals.distance_m_planned);
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

  return (
    <div className={className}>
      <StorySection eyebrow="The climbs" title={`${climbs.length} climbs`}>
        <p className="lede">
          Climbing speed against the plan, by the meters climbed:{" "}
          <strong>{speed(halves[0])}</strong> on the first half&apos;s climbs,{" "}
          <strong>{speed(halves[1])}</strong> on the second&apos;s.
        </p>
        <div className="chart-frame">
          <ol className="row-list" data-testid="climbs">
            {climbs.map((climb, index) => {
              const category = getClimbCategory(climb);
              const planned = climb.vam_m_per_h_planned;
              const actual = climb.vam_m_per_h_actual;
              const tone = toneOfVam(actual, planned);
              return (
                <li
                  key={index}
                  className={climb === active ? "row active" : "row"}
                  onPointerEnter={() => setCursor(climb.distance_m_start + climb.distance_m / 2)}
                  onPointerLeave={() => setCursor(null)}
                >
                  <span className="row-label">
                    <span className="climb-category">{category?.key ?? "·"}</span>
                    km {(climb.distance_m_start / 1000).toFixed(1)} · +
                    {Math.round(climb.elevation_gain_m)} m
                  </span>
                  <span className="row-track">
                    {planned != null && actual != null && (
                      <span
                        className="dumbbell-link"
                        style={{
                          left: `${scale(Math.min(planned, actual))}%`,
                          width: `${Math.abs(scale(planned) - scale(actual))}%`,
                        }}
                      />
                    )}
                    {planned != null && (
                      <span
                        className="dumbbell-mark planned"
                        style={{ left: `${scale(planned)}%` }}
                      />
                    )}
                    {actual != null && (
                      <span
                        className="dumbbell-mark actual"
                        data-tone={tone}
                        style={{ left: `${scale(actual)}%` }}
                      />
                    )}
                  </span>
                  <span className="row-value" data-tone={tone}>
                    {actual == null ? "–" : Math.round(actual)}
                    <span className="climb-planned">
                      {planned == null ? " unplanned" : ` / ${Math.round(planned)}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch dumbbell-mark planned" /> planned VAM
            </span>
            <span className="legend-item">
              <span className="legend-swatch dumbbell-mark actual" data-tone="ahead" /> faster
            </span>
            <span className="legend-item">
              <span className="legend-swatch dumbbell-mark actual" data-tone="behind" /> slower
            </span>
            <span className="legend-item">m/h, actual / planned</span>
          </div>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryClimbs);
