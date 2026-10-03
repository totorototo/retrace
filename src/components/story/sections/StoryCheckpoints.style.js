import styled from "styled-components";

import { chartCss, rowsCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${rowsCss}

  /* why: a mark sits centred on its value, so one at either end of the scale (the plan's
     zero buffer at the start) would hang half outside the track. */
  [data-testid="buffers"] .row-track {
    margin-inline: 6px;
  }

  /* Phones: name and margin on one line, the track the full width under them. The shared
     rows put the value beside the track, which leaves it about half the width. Local to the
     buffers: Budget and Climbs line their rows up with a tick axis. */
  @media (max-width: 40em) {
    [data-testid="buffers"] {
      gap: 0.75rem;
    }

    [data-testid="buffers"] .row {
      grid-template-columns: minmax(0, 1fr) max-content;
      gap: 0.375rem 0.75rem;

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

  .table-wrap {
    overflow-x: auto;
    margin-top: 2.5rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-small);
  }

  th,
  td {
    padding: 8px;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  }

  th:first-child,
  td:first-child {
    text-align: left;
  }

  th {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-tiny);
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }

  td {
    font-family: var(--font-family-mono);
  }

  td[data-tone="behind"] {
    color: var(--color-behind-text);
  }

  td[data-tone="ahead"] {
    color: var(--color-ahead-text);
  }

  /* Phones: seven columns don't fit, and scrolling sideways hides the times, which matter
     most. Each row is two lines instead: the name and its km, then the five times, each
     under its column's name. */
  @media (max-width: 40em) {
    .table-wrap {
      overflow-x: visible;
    }

    /* why: with fifteen rows, a header row at the top is screens away from the last ones,
       and a sticky one would slide under the theme toggle. Each time carries its own label. */
    thead {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }

    tr {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      column-gap: 0.25rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
    }

    td {
      padding: 0;
      border-bottom: none;
    }

    td:first-child {
      grid-column: 1 / 5;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: var(--font-weight-semibold);
    }

    td:nth-child(2) {
      grid-column: 5;
      align-self: center;
      font-size: var(--font-size-tiny);
      color: color-mix(in srgb, var(--color-text) 55%, transparent);

      &::after {
        content: " km";
      }
    }

    td:nth-child(n + 3) {
      margin-top: 0.5rem;

      &::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 2px;
        font-family: var(--font-family-sansSerif);
        font-size: var(--font-size-xsmall);
        color: color-mix(in srgb, var(--color-text) 55%, transparent);
      }
    }
  }
`;

export default style;
