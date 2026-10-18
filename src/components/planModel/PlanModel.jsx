import useStore from "../../store/store.js";
import { modelText } from "./modelText.js";

// The plan.json's model, a row of Setup's ledger once the file is in: the one the race is
// compared with, as debriefz or gpxz report it. Nothing to pick: Regimen sets it.
export default function PlanModel() {
  const planFile = useStore((state) => state.planFile);
  const settings = useStore((state) => state.report?.settings ?? state.plan?.settings);
  if (!planFile) return null;

  return (
    <div className="row">
      <span className="row-label">Model</span>
      <div className="row-body--wide">
        <span data-testid="plan-model">{modelText(settings) ?? "Read once the route is in"}</span>
        <p className="row-note">From {planFile.name}, made in Regimen.</p>
      </div>
    </div>
  );
}
