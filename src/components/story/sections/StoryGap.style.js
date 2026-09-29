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

  .gap-area {
    stroke: none;

    &.behind {
      fill: color-mix(in srgb, var(--color-behind) 55%, transparent);
    }

    &.ahead {
      fill: color-mix(in srgb, var(--color-ahead) 70%, transparent);
    }
  }
`;

export default style;
