import { fireEvent, render, screen } from "@testing-library/react";

import useStore, { DEFAULT_SETTINGS } from "../../store/store.js";
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
    settings: DEFAULT_SETTINGS,
  }),
);

it("opens on the intro, the files and the settings, before there is a report", () => {
  render(<Setup />);
  expect(screen.getByRole("heading", { name: "Your race, against the plan" })).toBeInTheDocument();
  expect(screen.getByTestId("gpx-input")).toBeInTheDocument();
  expect(screen.getByTestId("fit-input")).toBeInTheDocument();
  expect(screen.getByRole("form", { name: "Plan settings" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
});

it("folds to one row once there is a report, and opens to change it", () => {
  useStore.setState({
    report: {},
    gpx: { name: "route.gpx" },
    fit: { name: "activity.fit" },
  });
  render(<Setup />);
  expect(screen.queryByRole("form", { name: "Plan settings" })).toBeNull();
  expect(screen.getByText("Default profile · 1 hour at each LifeBase")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  expect(screen.getByTestId("gpx-name")).toHaveTextContent("route.gpx");
  expect(screen.getByRole("form", { name: "Plan settings" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.queryByRole("form", { name: "Plan settings" })).toBeNull();
});

it("keeps the files in view while one is read", () => {
  useStore.setState({ status: "working", phase: "reading" });
  render(<Setup />);
  expect(screen.getByRole("status")).toHaveTextContent("Reading the file…");
  expect(screen.getByTestId("gpx-input")).toBeInTheDocument();
});
