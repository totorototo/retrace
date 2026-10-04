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

// The first render pays the cold start of every section (React, styled-components, d3):
// ~1.5 s locally, 8.7 s under coverage on CI, past the 5 s default. Later renders take ~50 ms.
it("tells the race from the report", { timeout: 20000 }, () => {
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

// The map is lazy: its first import brings in mapbox-gl, which under coverage on a cold CI
// runner takes over findBy's 1 s default (~0.3 s locally, 1.3 s on CI).
it("asks for a Mapbox token when there is none", async () => {
  renderStory();
  expect(await screen.findByText(/Set VITE_MAPBOX_KEY/, {}, { timeout: 5000 })).toBeInTheDocument();
});

it("lists the climbs, and pointing at one marks it on the terrain", () => {
  renderStory();
  const rows = within(screen.getByTestId("climbs")).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("−1'+18%");
  expect(rows[0].querySelector(".row-value")).toHaveAttribute("data-tone", "ahead");
  expect(rows[1].querySelector(".row-value")).toHaveAttribute("data-tone", "behind");
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

// Three checkpoints are fewer than a real fit needs; the shape is what's under test.
const calibrated = {
  ...report,
  settings: { pace_base_s_per_km: 500, fatigue_coefficient: 0.002, life_base_stop_s: 600 },
  calibration: {
    sections_used: 3,
    sections_off_route: 1,
    pace_base_s_per_km: 472,
    fatigue_coefficient: 0.0035,
    life_base_stop_s: null,
    checkpoint_stop_s: 400,
    duration_s_replanned: [0, 800, 2700],
    error_s_rms_planned: 354,
    error_s_rms_replanned: 100,
    error_s_max_planned: 400,
    error_s_max_replanned: 100,
  },
};

it("says when there is no calibration", () => {
  renderStory();
  expect(screen.getByTestId("calibration-none")).toHaveTextContent("Not enough of the race");
});

it("tells the fitted settings, and how much closer they come", () => {
  useStore.setState({ report: calibrated });
  renderStory();
  expect(screen.queryByTestId("calibration-none")).toBeNull();
  expect(
    screen.getByText(/Fitted on 3 sections \(1 left out for running off the trace\)/),
  ).toHaveTextContent(
    "a base pace of 7:52/km, faster than the plan's 8:20/km, but a fade of 0.0035, steeper " +
      "than 0.0020. Rerun with those and the actual stops, the plan finishes in 0h45 against " +
      "0h47 run; its worst miss is 0h02, at Aid.",
  );
  const rows = within(screen.getByTestId("calibration-settings")).getAllByRole("row");
  expect(rows[1]).toHaveTextContent("Base pace8:20/km7:52/km");
  // The Aid is no LifeBase: its 10 min planned stop counts with the others.
  expect(rows[3]).toHaveTextContent("LifeBase stop––");
  expect(rows[4]).toHaveTextContent("Other stops0h100h07");
});

it("reads out both plans' misses at the checkpoint under the pointer", () => {
  useStore.setState({ report: calibrated });
  renderStory();
  const readout = screen.getByTestId("calibration-readout");
  expect(readout).toHaveTextContent("0h06 → 0h02 on average");
  pointAt(readout.nextElementSibling, 150);
  expect(readout).toHaveTextContent("Aid");
  expect(readout).toHaveTextContent("plan +0h05");
  expect(readout).toHaveTextContent("fitted +0h02");
});

// The Aid as a LifeBase: two stages, one per section.
const staged = {
  ...report,
  stages: report.sections.map((section, index) => ({
    ...section,
    section_index_first: index,
    section_index_end: index + 1,
  })),
};

it("has no stage switch for a single stage", () => {
  renderStory();
  expect(screen.queryByRole("radiogroup", { name: "Pace by" })).toBeNull();
});

it("switches the pace between sections and stages", () => {
  useStore.setState({ report: staged });
  renderStory();
  const level = within(screen.getByRole("radiogroup", { name: "Pace by" }));
  expect(level.getByRole("radio", { name: "Sections" })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(level.getByRole("radio", { name: "Stages" }));
  expect(screen.getByRole("heading", { name: "Stage by stage" })).toBeInTheDocument();
  expect(screen.getByText(/slowest stage into Aid at/)).toBeInTheDocument();
  const readout = screen.getByTestId("pace-readout");
  pointAt(readout.nextElementSibling, 300);
  expect(readout).toHaveTextContent("Aid → Finish");
});

it("says when the race was run, on its own clock", () => {
  useStore.setState({
    report: {
      ...report,
      totals: { ...report.totals, epoch_s_start_actual: 1787281427, utc_offset_s: 7200 },
    },
  });
  renderStory();
  expect(screen.getByTestId("hero-when")).toHaveTextContent(
    "Fri 21 Aug, started 05:03, finished Fri 05:50 · UTC+2",
  );
});

it("switches the climbs to the descents, and points at one on the terrain", () => {
  renderStory();
  const kinds = within(screen.getByRole("radiogroup", { name: "Climbs or descents" }));
  fireEvent.click(kinds.getByRole("radio", { name: "Descents" }));
  expect(screen.getByRole("heading", { name: "1 descent" })).toBeInTheDocument();
  expect(screen.getByText(/lost on the descents/)).toHaveTextContent(
    "0h01 lost on the descents: +0h01 in the first half, +0h00 in the second.",
  );
  const [row] = within(screen.getByTestId("climbs")).getAllByRole("listitem");
  expect(row).toHaveTextContent("km 1.0 · −100 m");
  fireEvent.pointerEnter(row);
  expect(screen.getByTestId("profile-readout")).toHaveTextContent("descent −100 m from 1200 m");
});

it("keeps a climb with a detour in it out of the totals", () => {
  renderStory();
  // The second climb (2000-3000 m) holds the 2200-2600 m detour: lost 5 min, not counted.
  const rows = within(screen.getByTestId("climbs")).getAllByRole("listitem");
  expect(rows[1]).toHaveTextContent("off trace");
  expect(screen.getByText(/on the climbs/)).toHaveTextContent("0h01 gained on the climbs");
});

it("follows the heart rate along the route, with its section's pace", () => {
  renderStory();
  expect(screen.getByText(/bpm on the first section/)).toHaveTextContent(
    "From 150 bpm on the first section to 140 on the last, while the pace quickened.",
  );
  const readout = screen.getByTestId("heart-readout");
  pointAt(readout.nextElementSibling, 100);
  expect(readout).toHaveTextContent("km 1.0");
  expect(readout).toHaveTextContent("148 bpm");
  expect(readout).toHaveTextContent("Start → Aid");
  expect(readout).toHaveTextContent("pace 1.50×");
});

it("says when the recording has no heart rate", () => {
  useStore.setState({
    report: {
      ...report,
      profile: report.profile.map((point) => ({ ...point, heart_rate_bpm_average: null })),
    },
  });
  renderStory();
  expect(screen.getByTestId("heart-none")).toBeInTheDocument();
});
