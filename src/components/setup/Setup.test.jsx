import { fireEvent, render, screen } from "@testing-library/react";

import useStore, { DEFAULT_SETTINGS } from "../../store/store.js";
import Setup from "./Setup.jsx";

beforeEach(() =>
  useStore.setState({
    report: null,
    plan: null,
    activity: null,
    status: "idle",
    error: null,
    gpx: null,
    fit: null,
    settings: DEFAULT_SETTINGS,
  }),
);

it("opens on the intro and the files, before there is a report", () => {
  render(<Setup />);
  expect(screen.getByRole("heading", { name: "Your race, against the plan" })).toBeInTheDocument();
  expect(screen.getByTestId("gpx-input")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
});

it("folds to one row once there is a report, and opens to change it", () => {
  useStore.setState({
    report: {},
    gpx: { name: "route.gpx" },
    fit: { name: "activity.fit" },
  });
  render(<Setup />);
  expect(screen.queryByTestId("gpx-input")).toBeNull();
  expect(screen.getByText("Default profile · 1 hour at each LifeBase")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  expect(screen.getByTestId("gpx-name")).toHaveTextContent("route.gpx");

  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.queryByTestId("gpx-input")).toBeNull();
});
