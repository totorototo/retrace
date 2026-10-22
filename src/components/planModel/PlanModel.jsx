import useStore from "../../store/store.js";
import { modelText } from "./modelText.js";

// The plan.json's model, a note under Setup's list once the file is in: the one the race is
// compared with, as debriefz or gpxz report it. Nothing to pick: Regimen sets it.
export default function PlanModel() {
  const planFile = useStore((state) => state.planFile);
  const settings = useStore((state) => state.report?.settings ?? state.plan?.settings);
  if (!planFile) return null;

  return (
    <p className="model">
      <span className="model-label">Model</span>{" "}
      <span data-testid="plan-model">{modelText(settings) ?? "Read once the route is in"}</span>
      <span className="model-source">From {planFile.name}, made in Regimen.</span>
    </p>
  );
}
