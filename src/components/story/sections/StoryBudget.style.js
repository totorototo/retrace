import styled from "styled-components";

import { chartCss, rowsCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${rowsCss}

  .row {
    cursor: default;
  }

  .budget-fill {
    --fill: color-mix(in srgb, var(--color-text) 55%, transparent);
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--fill);

    &[data-tone="behind"] {
      --fill: color-mix(in srgb, var(--color-behind) 88%, transparent);
    }

    &[data-tone="ahead"] {
      --fill: color-mix(in srgb, var(--color-ahead) 88%, transparent);
    }

    /* Stops: the same tone, striped, so the pair reads as one section's delta. */
    &.stop {
      background: repeating-linear-gradient(
        -45deg,
        var(--fill) 0 3px,
        color-mix(in srgb, var(--fill) 35%, transparent) 3px 6px
      );
    }
  }

  .legend-swatch.budget-fill {
    position: static;
    display: inline-block;
  }
`;

export default style;
