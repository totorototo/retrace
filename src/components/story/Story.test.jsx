import { fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";

import useStore from "../../store/store.js";
import THEME from "../../theme/Theme.js";
import { report } from "./report.fixture.js";
import Story from "./Story.jsx";
import { STORY_SECTIONS } from "./storySections.js";

const renderStory = () =>
  render(
    <ThemeProvider theme={{ ...THEME, currentVariant: "dark" }}>
      <Story />
    </ThemeProvider>,
  );

beforeEach(() => useStore.setState({ report, cursor_m: null }));

it("tells the race from the report", () => {
  renderStory();
  expect(screen.getByTestId("total-actual")).toHaveTextContent("0h47");
  expect(screen.getByTestId("total-delta")).toHaveTextContent("+0h07");
  expect(screen.getByText(/until km 2, then behind for good/)).toBeInTheDocument();
  expect(within(screen.getByTestId("budget")).getAllByRole("listitem")).toHaveLength(2);
  expect(within(screen.getByTestId("checkpoints")).getAllByRole("row")).toHaveLength(4);
  expect(screen.getByText(/missed by 0h02/)).toBeInTheDocument();
});

it("has a dot for each section", () => {
  renderStory();
  expect(screen.getAllByRole("button", { name: /Jump to/ })).toHaveLength(STORY_SECTIONS.length);
});

const pointAt = (plot, clientX) => {
  plot.getBoundingClientRect = () => ({ left: 0, width: 350 });
  fireEvent.pointerMove(plot, { clientX });
};

it("shares the cursor: pointing at the gap reads out the terrain there", () => {
  renderStory();
  const profile = screen.getByTestId("profile-readout");
  expect(profile).toHaveTextContent("Point along the profile");
  pointAt(screen.getByTestId("gap-readout").nextElementSibling, 100);
  expect(profile).toHaveTextContent("km 1.0");
  expect(profile).toHaveTextContent("1200 m");
  expect(profile).toHaveTextContent("-0h01");
  fireEvent.pointerLeave(screen.getByTestId("gap-readout").nextElementSibling);
  expect(profile).toHaveTextContent("Point along the profile");
});

it("asks for a Mapbox token when there is none", async () => {
  renderStory();
  expect(await screen.findByText(/Set VITE_MAPBOX_KEY/)).toBeInTheDocument();
});

it("lists the climbs, and pointing at one marks it on the terrain", () => {
  renderStory();
  const rows = within(screen.getByTestId("climbs")).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("2118 / 1800");
  expect(rows[0].querySelector(".climb-value")).toHaveAttribute("data-tone", "ahead");
  expect(rows[1].querySelector(".climb-value")).toHaveAttribute("data-tone", "behind");
  fireEvent.pointerEnter(rows[1]);
  expect(screen.getByTestId("profile-readout")).toHaveTextContent("climb +50 m to 1150 m");
  expect(rows[1]).toHaveClass("active");
  fireEvent.pointerLeave(rows[1]);
  expect(screen.getByTestId("profile-readout")).toHaveTextContent("Point along the profile");
});

it("reads out the section under the pointer", () => {
  renderStory();
  const readout = screen.getByTestId("pace-readout");
  const plot = readout.nextElementSibling;
  plot.getBoundingClientRect = () => ({ left: 0, width: 350 });
  fireEvent.pointerMove(plot, { clientX: 300 });
  expect(readout).toHaveTextContent("Aid → Finish");
  expect(readout).toHaveTextContent("1.25×");
});
