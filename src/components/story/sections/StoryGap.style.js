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

  /* HTML, not SVG: a circle in the stretched viewBox would draw as an ellipse. */
  .cursor-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 50%;
    background: var(--color-text);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-background) 65%, transparent);
    pointer-events: none;
  }
`;

export default style;
