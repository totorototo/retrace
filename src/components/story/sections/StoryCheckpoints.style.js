import styled from "styled-components";

import { chartCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  .buffer-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .buffer-row {
    display: grid;
    grid-template-columns: minmax(6rem, 11rem) 1fr minmax(3.5rem, max-content);
    align-items: center;
    gap: 0.75rem;

    /* Phone width: the label on its own line, so the bar keeps the width. */
    @media (max-width: 40em) {
      grid-template-columns: 1fr minmax(3.5rem, max-content);
      gap: 0.25rem 0.75rem;

      .buffer-label {
        grid-column: 1 / -1;
      }
    }
  }

  .buffer-label,
  .buffer-value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xsmall);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .buffer-value {
    text-align: right;

    &[data-missed] {
      color: var(--color-behind-text);
    }
  }

  .buffer-track {
    position: relative;
    display: block;
    height: 12px;
  }

  .buffer-zero {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 1px;
    background: color-mix(in srgb, var(--color-text) 40%, transparent);
  }

  .buffer-link {
    position: absolute;
    top: 50%;
    height: 2px;
    margin-top: -1px;
    background: color-mix(in srgb, var(--color-text) 20%, transparent);
  }

  .buffer-mark {
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
      background: var(--color-secondary);

      &[data-missed] {
        background: var(--color-accent);
      }
    }
  }

  .legend-swatch.buffer-mark {
    position: static;
    display: inline-block;
    margin: 0;
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
