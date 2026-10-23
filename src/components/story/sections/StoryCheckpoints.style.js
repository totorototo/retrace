import styled from "styled-components";

import { chartCss, rowsCss } from "./chart.style.js";

// The suite's checkpoint row (design system CheckpointRow), as Terminus draws it.
const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${rowsCss}

  /* why: a mark sits centred on its value, so one at either end of the scale (the plan's
     zero buffer at the start) would hang half outside the track. */
  [data-testid="buffers"] .row-track {
    margin-inline: var(--space-2);
  }

  /* Phones: name and margin on one line, the track the full width under them. The shared
     rows put the value beside the track, which leaves it about half the width. Local to the
     buffers: Budget and Climbs line their rows up with a tick axis. */
  @media (max-width: 40em) {
    [data-testid="buffers"] {
      gap: var(--space-3);
    }

    [data-testid="buffers"] .row {
      grid-template-columns: minmax(0, 1fr) max-content;
      gap: var(--space-2) var(--space-3);

      .row-label {
        grid-column: 1;
      }

      .row-value {
        grid-column: 2;
        grid-row: 1;
      }

      .row-track {
        grid-column: 1 / -1;
      }
    }
  }

  /* The rows under the chart, set off from its legend. */
  .checkpoint-list {
    margin-top: var(--space-10);
    display: flex;
    flex-direction: column;
    list-style: none;
  }

  .checkpoint-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-hairline);

    &:last-child {
      border-bottom: 0;
    }
  }

  .checkpoint-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-4);
  }

  .checkpoint-name {
    font-weight: var(--font-weight-bold);
  }

  .checkpoint-km {
    margin-top: var(--space-1);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: var(--color-text-muted);
  }

  .checkpoint-key {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
    white-space: nowrap;
  }

  .checkpoint-time {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-medium);
    font-weight: var(--font-weight-bold);
  }

  /* Outlined, no tint: a 14% fill dropped the label under 4.5:1. The word carries the state. */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    border: 1px solid currentColor;
    border-radius: var(--border-radius-lg);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .tier-ok {
    color: var(--color-success-text);
  }

  .tier-tight {
    color: var(--color-primary-text);
  }

  .tier-over {
    color: var(--color-behind-text);
  }

  /* Vs plan and Spare at departure (value over label); Details reuses the grid. */
  .checkpoint-figures,
  .checkpoint-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3) var(--space-6);
    margin: 0;
    padding: var(--space-3);
    border-radius: var(--border-radius-md);
    background: color-mix(in srgb, var(--color-text) 3%, transparent);

    > div {
      display: flex;
      flex-direction: column-reverse;
      gap: var(--space-hair);
    }

    dt {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-tiny);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-small);
      font-weight: var(--font-weight-bold);

      &[data-tone="behind"] {
        color: var(--color-behind-text);
      }

      &[data-tone="ahead"] {
        color: var(--color-ahead-text);
      }
    }
  }

  .checkpoint-details {
    grid-template-columns: repeat(3, 1fr);
  }

  .details-toggle,
  .show-more {
    align-self: flex-start;
    min-height: 44px;
    padding: 0;
    background: none;
    border: 0;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary-text);
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  /* The design system's collapse toggle: dashed, the full width. */
  .show-more {
    width: 100%;
    margin-top: var(--space-2);
    border: 1px dashed var(--color-control-border);
    border-radius: var(--border-radius-base);
  }

  /* Details fold open: one grid row 0fr -> 1fr, to the content's own height. The negative
     margin cancels the row's gap while closed; reduced motion is the global rule. */
  .fold {
    display: grid;
    grid-template-rows: 0fr;
    margin-top: calc(-1 * var(--space-3));
    opacity: 0;
    transition:
      grid-template-rows var(--transition-standard),
      margin-top var(--transition-standard),
      opacity var(--transition-standard);

    &.open {
      grid-template-rows: 1fr;
      margin-top: 0;
      opacity: 1;
    }
  }

  .fold-inner {
    min-height: 0;
    overflow: hidden;
  }
`;

export default style;
