import styled from "styled-components";

export const Form = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-tiny);
    color: var(--color-text);
    opacity: 0.85;
  }

  input {
    width: 140px;
    padding: 8px 10px;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid transparent;
    border-radius: var(--border-radius-sm);
  }

  input:focus {
    border-color: var(--color-primary);
    outline: none;
  }
`;
