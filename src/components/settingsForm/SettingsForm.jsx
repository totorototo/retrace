import useStore from "../../store/store.js";
import { modelText } from "./modelText.js";
import {
  LIFE_BASE_STOP_OPTIONS,
  profileOf,
  RUNNER_PROFILES,
  stopOf,
} from "./PaceSettings.constants.js";
import { Picker as PickerRow } from "./SettingsForm.style.js";

// gpxz's pace settings, which must match the ones the plan was made with: Terminus's
// runner profile and LifeBase stop pickers, plus its default as a profile of its own.
// Each picker is a row of Setup's ledger. With a plan.json loaded, its model is the one in
// effect, and the pickers give way to it.
function Picker({ label, name, options, selected, onPick }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <div className="row-body--wide">
        <PickerRow role="radiogroup" aria-label={name}>
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={option === selected}
              className={option === selected ? "chip active" : "chip"}
              onClick={() => onPick(option)}
            >
              {option.label}
            </button>
          ))}
        </PickerRow>
        <p className="row-note">{selected?.sub ?? "Custom: matches none of these"}</p>
      </div>
    </div>
  );
}

// The plan.json's model, as debriefz or gpxz report the one they ran with.
function PlanFileModel({ name }) {
  const settings = useStore((state) => state.report?.settings ?? state.plan?.settings);
  return (
    <div className="row">
      <span className="row-label">Model</span>
      <div className="row-body--wide">
        <span data-testid="plan-model">{modelText(settings) ?? "Read once a route is in"}</span>
        <p className="row-note">From {name}: the pickers are off while a plan.json is loaded.</p>
      </div>
    </div>
  );
}

export default function SettingsForm() {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);
  const planFile = useStore((state) => state.planFile);
  if (planFile) return <PlanFileModel name={planFile.name} />;

  return (
    <form onSubmit={(event) => event.preventDefault()} aria-label="Plan settings">
      <Picker
        label="Profile"
        name="Runner profile"
        options={RUNNER_PROFILES}
        selected={profileOf(settings)}
        onPick={({ pace_base_s_per_km, fatigue_coefficient }) =>
          setSettings({ pace_base_s_per_km, fatigue_coefficient })
        }
      />
      <Picker
        label="Stops"
        name="Planned stop at each LifeBase"
        options={LIFE_BASE_STOP_OPTIONS}
        selected={stopOf(settings)}
        onPick={(option) => setSettings({ life_base_stop_s: option.value })}
      />
    </form>
  );
}
