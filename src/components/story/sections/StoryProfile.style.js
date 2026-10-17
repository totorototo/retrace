import styled from "styled-components";

import { chartCss, readoutLines } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${readoutLines(1, 2, 4)}

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

  /* The climb under the pointer is terrain: the design system's mauve, not the brand
     gold/blue (the plan in these charts). why effort-1 at 35%: the most saturated step in
     both variants; light's effort-4 at 22% read as grey, the night bands' shade. */
  .climb-band {
    fill: color-mix(in srgb, var(--color-effort-1) 35%, transparent);
  }

  .profile-line {
    fill: none;
    stroke: color-mix(in srgb, var(--color-text) 70%, transparent);
    stroke-width: 1.25;
    vector-effect: non-scaling-stroke;
  }
`;

export default style;
