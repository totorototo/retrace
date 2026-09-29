import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 1rem;
  background: none;
  border: 1px dashed color-mix(in srgb, var(--color-text) 20%, transparent);
  border-radius: var(--border-radius-base);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-small);
  letter-spacing: 0.05em;
  color: color-mix(in srgb, var(--color-text) 85%, transparent);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    border-style: solid;
    border-color: color-mix(in srgb, var(--color-text) 40%, transparent);
  }
`;

export default style;
