import { render, screen } from "@testing-library/react";

import useStore from "../../store/store.js";
import PlanModel from "./PlanModel.jsx";

beforeEach(() => useStore.setState({ planFile: null, plan: null, report: null }));

it("shows nothing before the plan.json is in", () => {
  const { container } = render(<PlanModel />);
  expect(container).toBeEmptyDOMElement();
});

it("shows the plan.json's model, from the route's summary or the report", () => {
  const settings = { pace_base_s_per_km: 450, fatigue_coefficient: 0.003, life_base_stop_s: 0 };
  useStore.setState({ planFile: { name: "route.plan.json" }, plan: { settings } });
  const { rerender } = render(<PlanModel />);
  expect(screen.getByTestId("plan-model")).toHaveTextContent(
    "7:30/km flat · fatigue 0.003 · no stop at LifeBases",
  );
  expect(screen.getByText(/From route.plan.json/)).toBeInTheDocument();

  useStore.setState({ plan: null, report: { settings: { ...settings, pace_base_s_per_km: 500 } } });
  rerender(<PlanModel />);
  expect(screen.getByTestId("plan-model")).toHaveTextContent(/^8:20\/km flat/);
});

it("waits for the route to read the model", () => {
  useStore.setState({ planFile: { name: "route.plan.json" } });
  render(<PlanModel />);
  expect(screen.getByTestId("plan-model")).toHaveTextContent("Read once the route is in");
});
