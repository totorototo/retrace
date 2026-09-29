import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;

  .map-frame {
    height: min(70vh, 32rem);
    border-radius: var(--border-radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
    overflow: hidden;
  }
`;

export default style;
