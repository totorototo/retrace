import { act, fireEvent, render, screen } from "@testing-library/react";

import useStore from "../../store/store.js";
import { report } from "../story/report.fixture.js";
import { ReplayControls } from "./Replay.jsx";

beforeEach(() => useStore.setState({ report, replay_s: null, replayPlaying: false }));

const scrubTo = (seconds) =>
  fireEvent.change(screen.getByRole("slider", { name: "Race time" }), {
    target: { value: String(seconds) },
  });

it("replays the race against the plan's runner", () => {
  render(<ReplayControls />);
  fireEvent.click(screen.getByRole("button", { name: /Replay against the plan/ }));
  useStore.getState().setReplay(0, false);

  // At the aid station together, the plan's runner still on its planned stop.
  scrubTo(1150);
  const readout = screen.getByTestId("replay-readout");
  expect(readout).toHaveTextContent("You 1.5 km");
  expect(readout).toHaveTextContent("Plan 1.5 km");
  expect(readout.querySelector("b")).toHaveTextContent("+0h09");
  expect(readout.querySelector("b")).toHaveAttribute("data-tone", "behind");

  // The plan's runner at the finish, the runner 0.4 km short of it.
  scrubTo(2400);
  expect(readout).toHaveTextContent("You 3.1 km");
  expect(readout).toHaveTextContent("Plan 3.5 km");
  expect(readout.querySelector("b")).toHaveTextContent("+0h04, 0.4 km behind");

  // Off the trace, no time is claimed.
  scrubTo(1800);
  expect(readout).toHaveTextContent("off the planned trace");

  fireEvent.click(screen.getByRole("button", { name: "Close the replay" }));
  expect(screen.getByRole("button", { name: /Replay against the plan/ })).toBeInTheDocument();
});

it("plays at the chosen speed and stops at the end", () => {
  // Frames run by hand: at most one is pending, as the clock asks for one at a time.
  let pending = new Map();
  let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    pending.set(++nextId, callback);
    return nextId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => pending.delete(id));
  const step = (now) =>
    act(() => {
      const callbacks = [...pending.values()];
      pending = new Map();
      for (const callback of callbacks) callback(now);
    });

  render(<ReplayControls />);
  fireEvent.click(screen.getByRole("button", { name: /Replay against the plan/ }));
  fireEvent.click(screen.getByRole("button", { name: "Replay speed: 60 times" }));
  expect(screen.getByRole("button", { name: "Replay speed: 120 times" })).toBeInTheDocument();

  step(0);
  step(1000);
  expect(useStore.getState().replay_s).toBe(120);
  expect(screen.getByTestId("replay-clock")).toHaveTextContent("0h02");

  step(60_000);
  expect(useStore.getState().replay_s).toBe(2800);
  expect(useStore.getState().replayPlaying).toBe(false);

  // Play from the end starts over.
  fireEvent.click(screen.getByRole("button", { name: "Play the replay" }));
  expect(useStore.getState().replay_s).toBe(0);
  vi.restoreAllMocks();
});
