import { fireEvent, render, screen, within } from "@testing-library/react";

import useStore, { DEFAULT_SETTINGS } from "../../store/store.js";
import SettingsForm from "./SettingsForm.jsx";

const radios = (group) => within(screen.getByRole("radiogroup", { name: group }));
const checked = (group) =>
  radios(group)
    .getAllByRole("radio")
    .filter((radio) => radio.getAttribute("aria-checked") === "true")
    .map((radio) => radio.textContent);

// No files loaded: setSettings only stores, its refresh has nothing to analyse.
beforeEach(() =>
  useStore.setState({
    settings: DEFAULT_SETTINGS,
    gpx: null,
    fit: null,
    planFile: null,
    plan: null,
    report: null,
  }),
);

it("gives way to a plan.json's model", () => {
  useStore.setState({
    planFile: { name: "route.plan.json" },
    plan: {
      settings: { pace_base_s_per_km: 450, fatigue_coefficient: 0.003, life_base_stop_s: 0 },
    },
  });
  render(<SettingsForm />);
  expect(screen.queryByRole("radiogroup")).toBeNull();
  expect(screen.getByTestId("plan-model")).toHaveTextContent(
    "7:30/km flat · fatigue 0.003 · no stop at LifeBases",
  );
  expect(screen.getByText(/From route.plan.json/)).toBeInTheDocument();
});

it("starts on Terminus's default: its own profile, and a 1 hour stop", () => {
  render(<SettingsForm />);
  expect(checked("Runner profile")).toEqual(["Default"]);
  expect(checked("Planned stop at each LifeBase")).toEqual(["1 hour"]);
  expect(screen.queryByRole("spinbutton")).toBeNull();
});

it("sets a profile's pace and fatigue, and highlights it", () => {
  render(<SettingsForm />);
  fireEvent.click(radios("Runner profile").getByRole("radio", { name: "Trail" }));
  expect(useStore.getState().settings).toMatchObject({
    pace_base_s_per_km: 365,
    fatigue_coefficient: 0.003,
  });
  expect(checked("Runner profile")).toEqual(["Trail"]);
  expect(screen.getByText("~6 min/km on flat")).toBeInTheDocument();
});

it("sets the stop at each LifeBase", () => {
  render(<SettingsForm />);
  fireEvent.click(radios("Planned stop at each LifeBase").getByRole("radio", { name: "30 min" }));
  expect(useStore.getState().settings.life_base_stop_s).toBe(1800);
  expect(checked("Planned stop at each LifeBase")).toEqual(["30 min"]);
});

it("highlights only an exact match", () => {
  useStore.setState({ settings: { ...DEFAULT_SETTINGS, fatigue_coefficient: 0.0021 } });
  render(<SettingsForm />);
  expect(checked("Runner profile")).toEqual([]);
});
