import { act, render, screen } from "@testing-library/react";

import AxisNames from "./AxisNames.jsx";

const markers = [10, 30, 50, 70, 90].map((pct) => ({ pct, name: `CP ${pct}` }));

let resize;
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback) {
        resize = (width) => callback([{ contentRect: { width } }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

it("keeps as many names as the measured width fits", () => {
  render(<AxisNames markers={markers} />);
  // Unmeasured: the 18% default keeps all five, 20% apart.
  expect(screen.getAllByText(/^CP/)).toHaveLength(5);

  // Phone width: a 78px name is 26% of 300px, so every other one.
  act(() => resize(300));
  expect(screen.getAllByText(/^CP/).map((name) => name.textContent)).toEqual([
    "CP 10",
    "CP 50",
    "CP 90",
  ]);

  act(() => resize(800));
  expect(screen.getAllByText(/^CP/)).toHaveLength(5);
});
