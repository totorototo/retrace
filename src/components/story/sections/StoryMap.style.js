import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;

  .map-frame {
    height: min(70vh, 32rem);
    border-radius: var(--border-radius-lg);
    border: 1px solid var(--color-hairline);
    overflow: hidden;
  }
`;

export default style;
