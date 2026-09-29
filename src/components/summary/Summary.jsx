import useStore from "../../store/store.js";
import { formatDelta, formatDuration, formatKm } from "../../utils/format.js";
import { Card, Cards, Section, Table, TableWrap } from "./Summary.style.js";

// Positive delta is behind the plan.
const toneOf = (deltaS) =>
  deltaS == null || Math.abs(deltaS) < 30 ? undefined : deltaS > 0 ? "behind" : "ahead";

function Stat({ label, value, tone, testId }) {
  return (
    <Card $tone={tone}>
      <dl>
        <dt>{label}</dt>
        <dd data-testid={testId}>{value}</dd>
      </dl>
    </Card>
  );
}

function Report({ report }) {
  const { totals, checkpoints } = report;
  const deltaS =
    totals.duration_s_actual == null ? null : totals.duration_s_actual - totals.duration_s_planned;

  return (
    <>
      <Section aria-label="Totals">
        <h2>{report.name ?? "Unnamed route"}</h2>
        <Cards>
          <Stat label="Distance" value={formatKm(totals.distance_m_planned)} />
          <Stat label="Planned" value={formatDuration(totals.duration_s_planned)} />
          <Stat
            label="Actual"
            value={formatDuration(totals.duration_s_actual)}
            testId="total-actual"
          />
          <Stat
            label="Delta"
            value={formatDelta(deltaS)}
            tone={toneOf(deltaS)}
            testId="total-delta"
          />
        </Cards>
      </Section>
      <Section aria-label="Checkpoints">
        <h2>Checkpoints</h2>
        <TableWrap>
          <Table data-testid="checkpoints">
            <thead>
              <tr>
                <th>Checkpoint</th>
                <th>km</th>
                <th>Plan</th>
                <th>Actual</th>
                <th>Delta</th>
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
                  <td>{formatDelta(checkpoint.margin_s_actual)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Section>
    </>
  );
}

function PlanOnly({ plan }) {
  return (
    <Section aria-label="Plan">
      <h2>{plan.name ?? "Unnamed route"}</h2>
      <Cards>
        <Stat label="Distance" value={formatKm(plan.distance_m)} testId="plan-distance" />
        <Stat label="D+" value={`${Math.round(plan.elevation_gain_m)} m`} />
        <Stat label="Checkpoints" value={plan.waypoints.length} />
      </Cards>
    </Section>
  );
}

function ActivityOnly({ activity }) {
  return (
    <Section aria-label="Activity">
      <h2>Activity</h2>
      <Cards>
        <Stat label="Duration" value={formatDuration(activity.duration_s)} />
        <Stat label="Samples" value={activity.samples} testId="activity-samples" />
        <Stat label="Device distance" value={formatKm(activity.session.distance_m)} />
      </Cards>
    </Section>
  );
}

export default function Summary() {
  const report = useStore((state) => state.report);
  const plan = useStore((state) => state.plan);
  const activity = useStore((state) => state.activity);

  if (report) return <Report report={report} />;
  return (
    <>
      {plan && <PlanOnly plan={plan} />}
      {activity && <ActivityOnly activity={activity} />}
    </>
  );
}
