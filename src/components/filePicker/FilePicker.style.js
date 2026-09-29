import styled from "styled-components";

export const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
`;

export const Slot = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 1px dashed
    ${({ $loaded }) => ($loaded ? "var(--color-secondary)" : "var(--color-progress)")};
  border-radius: var(--border-radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
  }

  span:first-child {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-primary-text);
  }

  span:last-of-type {
    font-size: var(--font-size-small);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
`;
