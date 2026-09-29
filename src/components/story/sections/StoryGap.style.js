import styled from "styled-components";

import { chartCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  .bridge-line {
    stroke: var(--color-text);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    vector-effect: non-scaling-stroke;
  }

  .gap-edge {
    fill: none;
    stroke-width: 1.75;
    vector-effect: non-scaling-stroke;

    &.behind {
      stroke: var(--color-behind);
    }

    &.ahead {
      stroke: var(--color-ahead);
    }
  }

  .gap-area {
    stroke: none;

    &.behind {
      fill: color-mix(in srgb, var(--color-behind) 88%, transparent);
    }

    &.ahead {
      fill: color-mix(in srgb, var(--color-ahead) 88%, transparent);
    }
  }
`;

export default style;
