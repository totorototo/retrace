import { useState } from "react";

import useStore from "../../store/store.js";
import { formatDuration, formatPace } from "../../utils/format.js";
import {
  LIFE_BASE_STOP_OPTIONS,
  profileOf,
  RUNNER_PROFILES,
  stopOf,
} from "./PaceSettings.constants.js";
import { Form } from "./SettingsForm.style.js";

// gpxz's pace settings, which must match the ones the plan was made with: Terminus's
// runner profile and LifeBase stop pickers, plus the raw numbers for any other plan.
const FIELDS = [
  { key: "pace_base_s_per_km", label: "Flat pace (s/km)", step: 5, min: 120 },
  { key: "fatigue_coefficient", label: "Fatigue", step: 0.0005, min: 0 },
  { key: "life_base_stop_s", label: "LifeBase stop (s)", step: 60, min: 0 },
];

function Picker({ label, options, selected, onPick, children }) {
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
      {children}
    </div>
  );
}

export default function SettingsForm() {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);
  const profile = profileOf(settings);
  const stop = stopOf(settings);
  const [customOpen, setCustomOpen] = useState(false);
  // Settings no preset matches can only be read, and changed, as numbers.
  const showFields = customOpen || !profile || !stop;

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
      >
        <button
          type="button"
          role="radio"
          aria-checked={!profile}
          className={profile ? "picker-btn" : "picker-btn active"}
          onClick={() => setCustomOpen(true)}
        >
          Custom
        </button>
      </Picker>
      <p className="picker-note">
        {profile?.sub ??
          `${formatPace(settings.pace_base_s_per_km)} on flat, fatigue ${settings.fatigue_coefficient}`}
      </p>

      <span className="picker-label">LifeBase stops</span>
      <Picker
        label="Planned stop at each LifeBase"
        options={LIFE_BASE_STOP_OPTIONS}
        selected={stop}
        onPick={(option) => setSettings({ life_base_stop_s: option.value })}
      />
      <p className="picker-note">
        {stop?.sub ?? `${formatDuration(settings.life_base_stop_s)} at each LifeBase`}
      </p>

      {showFields && (
        <div className="fields">
          {FIELDS.map(({ key, label, step, min }) => (
            <label key={key}>
              {label}
              {/* Keyed on the value, so a preset picked above shows here too. */}
              <input
                key={settings[key]}
                type="number"
                step={step}
                min={min}
                defaultValue={settings[key]}
                data-testid={`setting-${key}`}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value >= min && value !== settings[key]) {
                    setSettings({ [key]: key === "life_base_stop_s" ? Math.round(value) : value });
                  }
                }}
              />
            </label>
          ))}
        </div>
      )}
      <p className="hint">Pick the settings the plan was made with, in Terminus or gpxz.</p>
    </Form>
  );
}
