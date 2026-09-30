import styled from "styled-components";

import { chartCss, rowsCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${rowsCss}

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
    opacity: 0.7;
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
     most. Each row is two lines instead: the name and its km, then the five times, under
     headers laid out the same way. */
  @media (max-width: 40em) {
    .table-wrap {
      overflow-x: visible;
    }

    tr {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
    }

    th,
    td {
      padding: 6px 0;
      border-bottom: none;
    }

    th:nth-child(-n + 2) {
      display: none;
    }

    td:first-child {
      grid-column: 1 / 4;
      padding-top: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    td:nth-child(2) {
      grid-column: 4 / 6;
      padding-top: 10px;
      color: color-mix(in srgb, var(--color-text) 55%, transparent);

      &::after {
        content: " km";
      }
    }

    td:nth-child(n + 3) {
      padding-bottom: 10px;
    }
  }
`;

export default style;
