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
`;

export default style;
