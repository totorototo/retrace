import styled from "styled-components";

import { chartCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  .pace-bar {
    fill: color-mix(in srgb, var(--color-text) 30%, transparent);
    transition: fill var(--transition-fast);

    &[data-tone="behind"] {
      fill: color-mix(in srgb, var(--color-behind) 90%, transparent);
    }

    &[data-tone="ahead"] {
      fill: color-mix(in srgb, var(--color-ahead) 90%, transparent);
    }

    &.active {
      fill: var(--color-text);
    }
  }
`;

export default style;
