import styled from "styled-components";

import { chartCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}

  .profile-area {
    fill: color-mix(in srgb, var(--color-text) 22%, transparent);

    &[data-tone="behind"] {
      fill: color-mix(in srgb, var(--color-behind) 88%, transparent);
    }

    &[data-tone="ahead"] {
      fill: color-mix(in srgb, var(--color-ahead) 88%, transparent);
    }
  }

  .legend-swatch.profile-area {
    background: color-mix(in srgb, var(--color-text) 22%, transparent);

    &[data-tone="behind"] {
      background: color-mix(in srgb, var(--color-behind) 88%, transparent);
    }

    &[data-tone="ahead"] {
      background: color-mix(in srgb, var(--color-ahead) 88%, transparent);
    }
  }

  .climb-band {
    fill: color-mix(in srgb, var(--color-primary) 22%, transparent);
  }

  .profile-line {
    fill: none;
    stroke: color-mix(in srgb, var(--color-text) 70%, transparent);
    stroke-width: 1.25;
    vector-effect: non-scaling-stroke;
  }
`;

export default style;
