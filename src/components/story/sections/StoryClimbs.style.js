import styled from "styled-components";

import { chartCss, rowsCss } from "./chart.style.js";

const style = (Component) => styled(Component)`
  display: block;
  ${chartCss}
  ${rowsCss}

  .row {
    cursor: default;
  }

  /* Terminus's category badge, shrunk to a prefix so the row stays one line. */
  .climb-category {
    display: inline-block;
    min-width: 2.2em;
    font-weight: var(--font-weight-bold);
    color: var(--color-primary-text);
  }

  .climb-planned {
    color: color-mix(in srgb, var(--color-text) 50%, transparent);
  }
`;

export default style;
