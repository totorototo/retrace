import styled from "styled-components";

import { chartCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  .gap-area {
    stroke: none;

    &.behind {
      fill: color-mix(in srgb, var(--color-accent) 55%, transparent);
    }

    &.ahead {
      fill: color-mix(in srgb, var(--color-secondary) 70%, transparent);
    }
  }
`;

export default style;
