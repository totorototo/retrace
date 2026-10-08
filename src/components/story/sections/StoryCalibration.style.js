import styled from "styled-components";

import { chartCss, readoutLines } from "./chart.style.js";

// The plan in the text's colour, faded; the fitted one in the primary, as the track that was
// run is on the map: the line that follows the race.
const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${readoutLines(1, 2, 2)}

  .error-line {
    fill: none;
    stroke-width: 1.75;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;

    &.planned {
      stroke: color-mix(in srgb, var(--color-text) 45%, transparent);
    }

    &.replanned {
      stroke: var(--color-primary);
    }
  }

  .error-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    margin: -3px 0 0 -3px;
    border-radius: 50%;
    pointer-events: none;

    &.planned {
      background: color-mix(in srgb, var(--color-text) 45%, transparent);
    }

    &.replanned {
      background: var(--color-primary);
    }

    &.active {
      width: 9px;
      height: 9px;
      margin: -4.5px 0 0 -4.5px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-background) 65%, transparent);
    }
  }

  .planned-swatch {
    height: 3px;
    background: color-mix(in srgb, var(--color-text) 45%, transparent);
  }

  .replanned-swatch {
    height: 3px;
    background: var(--color-primary);
  }

  /* As the checkpoints table: mono figures, the labels quieter. */
  .settings {
    width: 100%;
    max-width: 28rem;
    margin-top: 2.5rem;
    border-collapse: collapse;
    font-size: var(--font-size-small);
  }

  .settings th,
  .settings td {
    padding: 8px;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  }

  .settings th:first-child {
    text-align: left;
  }

  .settings th {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .settings td {
    font-family: var(--font-family-mono);
  }

  .settings td:last-child {
    color: var(--color-text);
    font-weight: var(--font-weight-bold);
  }
`;

export default style;
