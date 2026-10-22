import { fireEvent, render, screen } from "@testing-library/react";

import useStore from "../../store/store.js";
import Setup from "./Setup.jsx";

beforeEach(() =>
  useStore.setState({
    report: null,
    plan: null,
    activity: null,
    status: "idle",
    phase: null,
    error: null,
    gpx: null,
    fit: null,
    planFile: null,
  }),
);

it("opens on the intro and the three files, before there is a report", () => {
  render(<Setup />);
  expect(screen.getByRole("heading", { name: "Your race, against the plan" })).toBeInTheDocument();
  expect(screen.getByTestId("gpx-input")).toBeInTheDocument();
  expect(screen.getByTestId("planFile-input")).toBeInTheDocument();
  expect(screen.getByTestId("planFile-name")).toHaveTextContent("Open plan.json");
  expect(screen.getByTestId("fit-input")).toBeInTheDocument();
  // Nothing to pick: the model is the plan.json's.
  expect(screen.queryByRole("radiogroup")).toBeNull();
  expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
});

it("asks for the plan.json once the route and the activity are in without it", () => {
  useStore.setState({ gpx: { name: "route.gpx" }, fit: { name: "a.fit" }, status: "done" });
  render(<Setup />);
  expect(screen.getByTestId("missing-plan")).toHaveTextContent("plan.json from Regimen");
});

it("folds to one row once there is a report, and opens to change it", () => {
  const settings = { pace_base_s_per_km: 500, fatigue_coefficient: 0.002, life_base_stop_s: 3600 };
  useStore.setState({
    report: { settings },
    gpx: { name: "route.gpx" },
    fit: { name: "activity.fit" },
    planFile: { name: "route.plan.json" },
  });
  render(<Setup />);
  expect(screen.queryByTestId("plan-model")).toBeNull();
  expect(
    screen.getByText("route.plan.json: 8:20/km flat · fatigue 0.002 · 1h00 at each LifeBase"),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  expect(screen.getByTestId("gpx-name")).toHaveTextContent("route.gpx");
  expect(screen.getByTestId("plan-model")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.queryByTestId("plan-model")).toBeNull();
});

it("keeps the files in view while one is read", () => {
  useStore.setState({ status: "working", phase: "reading" });
  render(<Setup />);
  expect(screen.getByRole("status")).toHaveTextContent("Reading the file…");
  expect(screen.getByTestId("gpx-input")).toBeInTheDocument();
});
