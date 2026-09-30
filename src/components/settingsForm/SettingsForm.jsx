import useStore from "../../store/store.js";
import {
  LIFE_BASE_STOP_OPTIONS,
  profileOf,
  RUNNER_PROFILES,
  stopOf,
} from "./PaceSettings.constants.js";
import { Picker as PickerRow } from "./SettingsForm.style.js";

// gpxz's pace settings, which must match the ones the plan was made with: Terminus's
// runner profile and LifeBase stop pickers, plus its default as a profile of its own.
// Each picker is a row of Setup's ledger.
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

export default function SettingsForm() {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);

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
