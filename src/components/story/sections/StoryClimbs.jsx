import { memo, useMemo } from "react";

import { getClimbCategory } from "../../../helpers/climbCategory.js";
import { useCollapsibleList } from "../../../hooks/useCollapsibleList.js";
import useStore from "../../../store/store.js";
import CollapseToggle from "../CollapseToggle.jsx";
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

// Terminus's climb list (category badge, where, how much) with the race added: climbing
// speed (VAM, vertical meters per hour) planned as a ring, actual as a dot.
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
  // Never collapse the climb the cursor is on out of sight.
  const { visibleCount, hiddenCount, expand } = useCollapsibleList(climbs.length, {
    threshold: 8,
    activeIndex: active ? climbs.indexOf(active) : -1,
  });

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
          <ol className="climb-list" data-testid="climbs">
            {climbs.slice(0, visibleCount).map((climb, index) => {
              const category = getClimbCategory(climb);
              const planned = climb.vam_m_per_h_planned;
              const actual = climb.vam_m_per_h_actual;
              const tone = toneOfVam(actual, planned);
              return (
                <li
                  key={index}
                  className={climb === active ? "climb-row active" : "climb-row"}
                  onPointerEnter={() => setCursor(climb.distance_m_start + climb.distance_m / 2)}
                  onPointerLeave={() => setCursor(null)}
                >
                  <span className={`climb-marker${category ? "" : " unranked"}`}>
                    {category?.key}
                  </span>
                  <span className="climb-info">
                    <span className="climb-meta">
                      km {(climb.distance_m_start / 1000).toFixed(1)} · +
                      {Math.round(climb.elevation_gain_m)} m ·{" "}
                      {climb.gradient_percent_average.toFixed(1)}%
                    </span>
                    <span className="climb-track">
                      {planned != null && actual != null && (
                        <span
                          className="climb-link"
                          style={{
                            left: `${scale(Math.min(planned, actual))}%`,
                            width: `${Math.abs(scale(planned) - scale(actual))}%`,
                          }}
                        />
                      )}
                      {planned != null && (
                        <span
                          className="climb-mark planned"
                          style={{ left: `${scale(planned)}%` }}
                        />
                      )}
                      {actual != null && (
                        <span
                          className="climb-mark actual"
                          data-tone={tone}
                          style={{ left: `${scale(actual)}%` }}
                        />
                      )}
                    </span>
                  </span>
                  <span className="climb-value" data-tone={tone}>
                    {actual == null ? "–" : Math.round(actual)}
                    <span className="climb-value-planned">
                      {planned == null ? " unplanned" : ` / ${Math.round(planned)}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <CollapseToggle hiddenCount={hiddenCount} onExpand={expand} />
          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch climb-mark planned" /> planned VAM
            </span>
            <span className="legend-item">
              <span className="legend-swatch climb-mark actual" data-tone="ahead" /> faster
            </span>
            <span className="legend-item">
              <span className="legend-swatch climb-mark actual" data-tone="behind" /> slower
            </span>
            <span className="legend-item">m/h, actual / planned</span>
          </div>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryClimbs);
