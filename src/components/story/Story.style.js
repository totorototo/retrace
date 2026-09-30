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
    /* Terminus's weight: its 1-unit stroke stretches with the 200-unit-wide viewBox. */
    stroke-width: 0.5vw;
    vector-effect: non-scaling-stroke;
    opacity: 0.16;
  }

  .story-content {
    position: relative;
    z-index: 1;
  }
`;

export default style;
