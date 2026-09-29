import styled from "styled-components";

import { chartCss } from "./chart.style.js";

// Rows laid out like Terminus's gradient breakdowns: label, track, value.
const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  .budget-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .budget-row {
    display: grid;
    grid-template-columns: minmax(6rem, 11rem) 1fr minmax(3.5rem, max-content);
    align-items: center;
    gap: 0.75rem;

    /* Phone width: the label on its own line, so the bar keeps the width. */
    @media (max-width: 40em) {
      grid-template-columns: 1fr minmax(3.5rem, max-content);
      gap: 0.25rem 0.75rem;

      .budget-label {
        grid-column: 1 / -1;
      }
    }
  }

  .budget-label,
  .budget-value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xsmall);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .budget-value {
    text-align: right;

    &[data-tone="behind"] {
      color: var(--color-accent-text);
    }

    &[data-tone="ahead"] {
      color: var(--color-secondary-text);
    }
  }

  .budget-track {
    position: relative;
    display: block;
    height: 12px;
    border-radius: var(--border-radius-sm);
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
  }

  .budget-zero {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 1px;
    background: color-mix(in srgb, var(--color-text) 40%, transparent);
  }

  .budget-fill {
    position: absolute;
    top: 0;
    bottom: 0;

    &.moving {
      background: var(--color-accent);
    }

    &.stop {
      background: var(--color-primary);
    }
  }

  .legend-swatch.budget-fill {
    position: static;
    display: inline-block;
  }
`;

export default style;
