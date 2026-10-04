import styled from "styled-components";

import { chartCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  /* A segmented switch, small enough to sit over the readout: the setup's chips, scaled down. */
  .level-switch {
    display: inline-flex;
    margin-bottom: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    border-radius: var(--border-radius-base);
    overflow: hidden;
  }

  .level {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    min-height: 32px;
    padding: 0.25rem 0.875rem;
    border: none;
    background: none;
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      color: var(--color-primary);
    }

    &.active {
      background: color-mix(in srgb, var(--color-text) 10%, transparent);
      color: var(--color-text);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
  }

  .pace-bar {
    fill: color-mix(in srgb, var(--color-text) 30%, transparent);
    transition: fill var(--transition-fast);

    &[data-tone="behind"] {
      fill: color-mix(in srgb, var(--color-behind) 88%, transparent);
    }

    &[data-tone="ahead"] {
      fill: color-mix(in srgb, var(--color-ahead) 88%, transparent);
    }

    &.active {
      fill: var(--color-text);
    }
  }
`;

export default style;
