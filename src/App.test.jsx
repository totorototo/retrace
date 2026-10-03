import { fireEvent, render, screen } from "@testing-library/react";

import App from "./App.jsx";
import useStore from "./store/store.js";

// The parts of the page around the story: status, the single-file summaries, theme.
const reset = (state) =>
  useStore.setState({
    report: null,
    plan: null,
    activity: null,
    status: "idle",
    error: null,
    gpx: null,
    ...state,
  });

beforeEach(() => reset());

it("says when it is working, and shows an error from the worker", () => {
  reset({ status: "working" });
  const { rerender } = render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Analysing");
  reset({ status: "error", error: "InvalidFit" });
  rerender(<App />);
  expect(screen.getByTestId("error")).toHaveTextContent("InvalidFit");
});

it("summarises a plan or an activity alone", () => {
  reset({
    plan: {
      name: "Test Trail",
      distance_m: 6000,
      elevation_gain_m: 312.4,
      waypoints: [{}, {}, {}],
    },
    activity: { duration_s: 3540, samples: 710, session: { distance_m: 6100 } },
  });
  render(<App />);
  expect(screen.getByTestId("plan-distance")).toHaveTextContent("6.0 km");
  expect(screen.getByText("312 m")).toBeInTheDocument();
  expect(screen.getByTestId("activity-samples")).toHaveTextContent("710");
  expect(screen.getByText("0h59")).toBeInTheDocument();
});

it("offers no file pickers: the race is the demo's", () => {
  render(<App />);
  expect(screen.queryByTestId("gpx-input")).toBeNull();
  expect(screen.queryByTestId("fit-input")).toBeNull();
});

it("switches between light and dark", () => {
  useStore.setState({ theme: "dark" });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
  expect(useStore.getState().theme).toBe("light");
  expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
});

it("closes the page with the footer", () => {
  render(<App />);
  expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026 retrace — La Vallée");
});
