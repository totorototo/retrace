import useStore from "../../store/store.js";
import { formatDuration, formatKm } from "../../utils/format.js";
import { Card, Cards, Section } from "./Summary.style.js";

function Stat({ label, value, testId }) {
  return (
    <Card>
      <dl>
        <dt>{label}</dt>
        <dd data-testid={testId}>{value}</dd>
      </dl>
    </Card>
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

// Before both files are in: what each one says on its own. With both, the story takes over.
export default function Summary() {
  const plan = useStore((state) => state.plan);
  const activity = useStore((state) => state.activity);

  return (
    <>
      {plan && <PlanOnly plan={plan} />}
      {activity && <ActivityOnly activity={activity} />}
    </>
  );
}
