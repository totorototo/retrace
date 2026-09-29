import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;

  .story-contour {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .contour-line {
    stroke: var(--color-secondary);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    opacity: 0.16;
  }

  .story-content {
    position: relative;
    z-index: 1;
  }
`;

export default style;
