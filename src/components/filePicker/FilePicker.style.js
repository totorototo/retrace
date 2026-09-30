import styled from "styled-components";

// The row itself is Setup's; these are what only a file row has.
export const FileName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${({ $loaded }) =>
    $loaded ? "var(--font-family-mono)" : "var(--font-family-sansSerif)"};
  font-size: ${({ $loaded }) => ($loaded ? "var(--font-size)" : "var(--font-size-small)")};
  color: ${({ $loaded }) =>
    $loaded ? "var(--color-text)" : "color-mix(in srgb, var(--color-text) 55%, transparent)"};
`;

// Visually hidden but still in the tab order; the row's chip shows its focus.
export const Input = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;

  label:has(&:focus-visible) .chip {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;
