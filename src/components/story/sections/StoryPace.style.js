import styled from "styled-components";

import { chartCss, readoutLines } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${readoutLines(2, 3, 3)}

  .pace-bar {
    fill: color-mix(in srgb, var(--color-text) 30%, transparent);
    transition: fill var(--transition-fast);

    &[data-tone="behind"] {
      fill: color-mix(in srgb, var(--color-behind) 88%, transparent);
    }

    &[data-tone="ahead"] {
      fill: color-mix(in srgb, var(--color-ahead) 88%, transparent);
    }

    &.active {
      fill: var(--color-text);
    }
  }
`;

export default style;
