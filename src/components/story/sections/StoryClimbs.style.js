import styled from "styled-components";

import { chartCss, rowsCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${rowsCss}

  /* why: a fixed value column, not the shared rows' max-content one: each row is a grid of
     its own, so "+1h50 off trace" beside "+5'" would narrow its track and shift its ticks off
     the axis row's. */
  .row {
    grid-template-columns: minmax(6rem, 11rem) 1fr 8rem;

    @media (max-width: 40em) {
      grid-template-columns: 1fr 6.75rem;
    }
  }
  }

  .row {
    cursor: default;
  }

  .climb-bar {
    position: absolute;
    top: 0;
    bottom: 0;
    background: color-mix(in srgb, var(--color-text) 45%, transparent);

    &[data-tone="behind"] {
      background: color-mix(in srgb, var(--color-behind) 88%, transparent);
    }

    &[data-tone="ahead"] {
      background: color-mix(in srgb, var(--color-ahead) 88%, transparent);
    }
  }

  .legend-swatch.climb-bar {
    position: static;
  }

  /* Terminus's category marker (a primary ring), shrunk to a pill that keeps the row on one
     line. Not filled for the hardest: Terminus fills it only for the climb in progress. */
  .climb-category {
    display: inline-block;
    min-width: 2.4em;
    margin-right: 0.5em;
    padding: 0 0.3em;
    border: 1px dashed color-mix(in srgb, var(--color-text) 35%, transparent);
    border-radius: var(--border-radius-xs);
    text-align: center;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-faint);

    &[data-category] {
      border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
      color: var(--color-primary-text);
    }
  }

  /* why: a fixed width, "off trace" as wide as "−37%" plus room: each row is a grid of its
     own, so a wider value would narrow that row's track and shift its ticks off the axis. */
  .climb-speed {
    display: inline-block;
    width: 9ch;
    text-align: right;
    margin-left: 0.6em;
    color: var(--color-text-faint);
  }

  /* Where the route's second half starts: the lede's two numbers, split in the list. */
  .halfway {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.25rem 0;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xxsmall);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-faint);

    &::before,
    &::after {
      content: "";
      flex: 1;
      border-top: 1px dashed color-mix(in srgb, var(--color-text) 25%, transparent);
    }
  }
`;

export default style;
