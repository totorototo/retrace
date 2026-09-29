import useStore from "../../store/store.js";
import {
  LIFE_BASE_STOP_OPTIONS,
  profileOf,
  RUNNER_PROFILES,
  stopOf,
} from "./PaceSettings.constants.js";
import { Form } from "./SettingsForm.style.js";

// gpxz's pace settings, which must match the ones the plan was made with: Terminus's
// runner profile and LifeBase stop pickers, plus its default as a profile of its own.
function Picker({ label, options, selected, onPick }) {
  return (
    <div className="picker" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={option === selected}
          className={option === selected ? "picker-btn active" : "picker-btn"}
          onClick={() => onPick(option)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsForm() {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);
  const profile = profileOf(settings);
  const stop = stopOf(settings);

  return (
    <Form onSubmit={(event) => event.preventDefault()} aria-label="Plan settings">
      <span className="picker-label">Runner profile</span>
      <Picker
        label="Runner profile"
        options={RUNNER_PROFILES}
        selected={profile}
        onPick={({ pace_base_s_per_km, fatigue_coefficient }) =>
          setSettings({ pace_base_s_per_km, fatigue_coefficient })
        }
      />
      <p className="picker-note">{profile?.sub}</p>

      <span className="picker-label">LifeBase stops</span>
      <Picker
        label="Planned stop at each LifeBase"
        options={LIFE_BASE_STOP_OPTIONS}
        selected={stop}
        onPick={(option) => setSettings({ life_base_stop_s: option.value })}
      />
      <p className="picker-note">{stop?.sub}</p>
      <p className="hint">Pick the settings the plan was made with in Terminus.</p>
    </Form>
  );
}
