import styled from "styled-components";

import { chartCss, rowsCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${rowsCss}

  .budget-track {
    border-radius: var(--border-radius-sm);
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
  }

  .budget-fill {
    position: absolute;
    top: 0;
    bottom: 0;

    &.moving {
      background: var(--color-accent);
    }

    &.stop {
      background: var(--color-primary);
    }
  }

  .legend-swatch.budget-fill {
    position: static;
    display: inline-block;
  }
`;

export default style;
