import styled from "styled-components";

// Visually hidden but still in the tab order; the row shows its focus.
export const Input = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;

  label:has(&:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;
