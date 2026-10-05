import styled from "styled-components";

import { chartCss, readoutLines } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${readoutLines(2, 3, 4)}

  /* The text's colour, not a tone: a heart rate is neither behind nor ahead of a plan. */
  .heart-line {
    fill: none;
    stroke: var(--color-text);
    stroke-width: 1.75;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .zero-label {
    left: auto;
    right: 0;
    transform: translateY(-110%);
  }

  /* The pace in the primary colour, dashed, as the plan's other lines: the heart rate leads. */
  .pace-line {
    fill: none;
    stroke: var(--color-primary);
    stroke-width: 1.5;
    stroke-dasharray: 4 2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .pace-dot {
    background: var(--color-primary);
  }

  .heart-swatch {
    height: 0;
    border-top: 2px solid var(--color-text);
  }

  .pace-swatch {
    height: 0;
    border-top: 2px dashed var(--color-primary);
  }
`;

export default style;
