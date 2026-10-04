import styled from "styled-components";

import { chartCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  /* The text's colour, not a tone: a heart rate is neither behind nor ahead of a plan. */
  .heart-line {
    fill: none;
    stroke: var(--color-text);
    stroke-width: 1.75;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  /* Dashed, as the gap's bridges: known over the stretch as a whole, not point by point. */
  .detour-level {
    stroke: var(--color-text);
    stroke-width: 1.75;
    stroke-dasharray: 4 3;
    vector-effect: non-scaling-stroke;
  }

  .detour-swatch {
    height: 0;
    border-top: 2px dashed var(--color-text);
  }
`;

export default style;
