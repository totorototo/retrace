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
beforeEach(() => useStore.setState({ settings: DEFAULT_SETTINGS, gpx: null, fit: null }));

it("shows gpxz's defaults as custom, with their numbers, since no profile is 500 s/km", () => {
  render(<SettingsForm />);
  expect(checked("Runner profile")).toEqual(["Custom"]);
  expect(checked("Planned stop at each LifeBase")).toEqual(["1 hour"]);
  expect(screen.getByTestId("setting-pace_base_s_per_km")).toHaveValue(500);
});

it("sets a profile's pace and fatigue, and highlights it only then", () => {
  render(<SettingsForm />);
  fireEvent.click(radios("Runner profile").getByRole("radio", { name: "Trail" }));
  expect(useStore.getState().settings).toMatchObject({
    pace_base_s_per_km: 365,
    fatigue_coefficient: 0.003,
  });
  expect(checked("Runner profile")).toEqual(["Trail"]);
  expect(screen.getByText("~6 min/km on flat")).toBeInTheDocument();
  // Every setting matches a preset: the numbers step aside.
  expect(screen.queryByTestId("setting-pace_base_s_per_km")).toBeNull();
});

it("sets the stop at each LifeBase", () => {
  render(<SettingsForm />);
  fireEvent.click(radios("Planned stop at each LifeBase").getByRole("radio", { name: "30 min" }));
  expect(useStore.getState().settings.life_base_stop_s).toBe(1800);
});

it("opens the numbers on demand, and a number off every preset reads as custom", () => {
  useStore.setState({
    settings: { pace_base_s_per_km: 330, fatigue_coefficient: 0.002, life_base_stop_s: 0 },
  });
  render(<SettingsForm />);
  expect(checked("Runner profile")).toEqual(["Athlete"]);
  fireEvent.click(radios("Runner profile").getByRole("radio", { name: "Custom" }));
  const pace = screen.getByTestId("setting-pace_base_s_per_km");
  fireEvent.change(pace, { target: { value: "340" } });
  fireEvent.blur(pace);
  expect(checked("Runner profile")).toEqual(["Custom"]);
  expect(screen.getByText(/5:40\/km on flat/)).toBeInTheDocument();
});
