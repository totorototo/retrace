import styled from "styled-components";

export const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
`;

export const Card = styled.div`
  padding: 12px 16px;
  border-radius: var(--border-radius-md);
  background: var(--color-surface);

  dt {
    font-size: var(--font-size-tiny);
    opacity: 0.7;
  }

  dd {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-medium);
    color: ${({ $tone }) =>
      $tone === "behind"
        ? "var(--color-accent-text)"
        : $tone === "ahead"
          ? "var(--color-secondary-text)"
          : "var(--color-text)"};
  }
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-primary-text);
  }
`;

export const TableWrap = styled.div`
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-small);

  th,
  td {
    padding: 8px;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
    color: var(--color-accent-text);
  }

  td[data-tone="ahead"] {
    color: var(--color-secondary-text);
  }
`;
