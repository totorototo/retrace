import styled from "styled-components";

import { chartCss } from "./chart.style.js";

// The badge from Terminus's StoryClimbs; the dumbbell as in the cutoff buffers.
const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  .climb-list {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .climb-row {
    display: grid;
    grid-template-columns: 2rem 1fr minmax(5.5rem, max-content);
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0.5rem;
    margin: 0 -0.5rem;
    border-radius: var(--border-radius-sm);
    cursor: default;
    transition: background var(--transition-fast);

    &.active {
      background: color-mix(in srgb, var(--color-text) 7%, transparent);
    }
  }

  .climb-marker {
    width: 2rem;
    height: 2rem;
    border-radius: var(--border-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-family-mono);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-tiny);
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
    color: var(--color-primary-text);

    &.unranked {
      opacity: 0.35;
      border-style: dashed;
    }
  }

  .climb-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .climb-meta,
  .climb-value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xsmall);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    white-space: nowrap;
  }

  .climb-value {
    text-align: right;
    color: var(--color-text);

    &[data-tone="behind"] {
      color: var(--color-behind-text);
    }

    &[data-tone="ahead"] {
      color: var(--color-ahead-text);
    }
  }

  .climb-value-planned {
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
  }

  .climb-track {
    position: relative;
    display: block;
    height: 12px;
  }

  .climb-link {
    position: absolute;
    top: 50%;
    height: 2px;
    margin-top: -1px;
    background: color-mix(in srgb, var(--color-text) 20%, transparent);
  }

  .climb-mark {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    margin: -5px 0 0 -5px;
    border-radius: 50%;

    &.planned {
      border: 2px solid var(--color-primary);
    }

    &.actual {
      background: color-mix(in srgb, var(--color-text) 55%, transparent);

      &[data-tone="behind"] {
        background: var(--color-behind);
      }

      &[data-tone="ahead"] {
        background: var(--color-ahead);
      }
    }
  }

  .legend-swatch.climb-mark {
    position: static;
    display: inline-block;
    margin: 0;
  }
`;

export default style;
