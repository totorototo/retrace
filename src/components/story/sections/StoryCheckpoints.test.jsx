import { fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";

import useStore from "../../../store/store.js";
import THEME from "../../../theme/Theme.js";
import { report } from "../report.fixture.js";
import StoryCheckpoints from "./StoryCheckpoints.jsx";

const renderSection = () =>
  render(
    <ThemeProvider theme={{ ...THEME, currentVariant: "dark" }}>
      <StoryCheckpoints />
    </ThemeProvider>,
  );

const rows = () => within(screen.getByTestId("checkpoints")).getAllByRole("listitem");
const rowOf = (name) => rows().find((row) => within(row).queryByText(name));

describe("StoryCheckpoints rows", () => {
  beforeEach(() => useStore.setState({ report, cursor_m: null }));

  it("gives each checkpoint its badge from the spare at departure", () => {
    renderSection();
    // Aid: 0h25 to spare, under 1h. Finish: 2 min past its cutoff.
    expect(within(rowOf("Aid")).getByText("Tight")).toBeInTheDocument();
    expect(within(rowOf("Aid")).getByText("0h25")).toBeInTheDocument();
    expect(within(rowOf("Finish")).getByText("Over")).toBeInTheDocument();
    expect(within(rowOf("Finish")).getByText("-0h02")).toBeInTheDocument();
  });

  it("prints the same spare as the lede", () => {
    renderSection();
    expect(screen.getByText(/missed by 0h02/)).toBeInTheDocument();
    expect(within(rowOf("Finish")).getByText("Spare at departure")).toBeInTheDocument();
  });

  it("shows the Start's time only: no figures, no badge, no details", () => {
    renderSection();
    const start = rowOf("Start");
    expect(within(start).queryByText("Vs plan")).toBeNull();
    expect(within(start).queryByRole("button", { name: "Details" })).toBeNull();
    expect(within(start).queryByText(/^(OK|Tight|Over)$/)).toBeNull();
  });

  it("has no Spare without a cutoff", () => {
    const checkpoints = report.checkpoints.map((checkpoint) =>
      checkpoint.name === "Aid" ? { ...checkpoint, margin_s_actual: null } : checkpoint,
    );
    useStore.setState({ report: { ...report, checkpoints } });
    renderSection();
    expect(within(rowOf("Aid")).getByText("Vs plan")).toBeInTheDocument();
    expect(within(rowOf("Aid")).queryByText("Spare at departure")).toBeNull();
  });

  it("opens Details on a fold its toggle controls", () => {
    renderSection();
    const toggle = within(rowOf("Aid")).getByRole("button", { name: "Details" });
    const fold = document.getElementById(toggle.getAttribute("aria-controls"));
    expect(fold).not.toBeNull();
    expect(fold).toHaveAttribute("inert");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(fold).not.toHaveAttribute("inert");
  });

  it("shows six rows, then the rest behind Show N more", () => {
    const extra = Array.from({ length: 6 }, (_, index) => ({
      ...report.checkpoints[1],
      name: `CP ${index + 1}`,
    }));
    useStore.setState({ report: { ...report, checkpoints: [...report.checkpoints, ...extra] } });
    renderSection();
    expect(rows()).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Show 3 more" }));
    expect(rows()).toHaveLength(9);
  });
});
