import useStore from "../../store/store.js";
import { Form } from "./SettingsForm.style.js";

// gpxz's pace settings. They must match the ones the plan was made with.
const FIELDS = [
  { key: "pace_base_s_per_km", label: "Flat pace (s/km)", step: 5, min: 120 },
  { key: "fatigue_coefficient", label: "Fatigue", step: 0.0005, min: 0 },
  { key: "life_base_stop_s", label: "LifeBase stop (s)", step: 60, min: 0 },
];

export default function SettingsForm() {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);

  return (
    <Form onSubmit={(event) => event.preventDefault()} aria-label="Plan settings">
      {FIELDS.map(({ key, label, step, min }) => (
        <label key={key}>
          {label}
          <input
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
    </Form>
  );
}
