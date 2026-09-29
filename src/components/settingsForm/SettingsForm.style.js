import styled from "styled-components";

// The pickers are Terminus's StoryPace profile buttons, on the CSS custom properties.
export const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .picker-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    color: color-mix(in srgb, var(--color-text) 80%, transparent);
    margin: 1.25rem 0 0.5rem;

    &:first-child {
      margin-top: 0;
    }
  }

  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .picker-btn {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    min-height: 44px;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius-base);
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    background: none;
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      border-color: color-mix(in srgb, var(--color-text) 35%, transparent);
    }

    &.active {
      border-color: var(--color-secondary);
      color: var(--color-secondary);
    }
  }

  .picker-note,
  .hint {
    margin-top: 0.5rem;
    font-size: var(--font-size-small);
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
  }

  .hint {
    margin-top: 1.25rem;
    font-size: var(--font-size-tiny);
  }

  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 1.25rem;
  }

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
