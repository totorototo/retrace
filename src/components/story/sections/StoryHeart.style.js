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
`;

export default style;
