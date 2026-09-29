import { css } from "styled-components";

// What the story's distance charts share: an SVG stretched to the frame, HTML labels
// overlaid so SVG text isn't distorted (as in Terminus's ElevationProfile), a readout line.
export const chartCss = css`
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    min-height: 1.5em;
    margin-bottom: 0.75rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    color: color-mix(in srgb, var(--color-text) 70%, transparent);

    b {
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }

    [data-tone="behind"] {
      color: var(--color-accent-text);
    }

    [data-tone="ahead"] {
      color: var(--color-secondary-text);
    }
  }

  .plot {
    position: relative;
    touch-action: pan-y;
    cursor: crosshair;

    svg {
      display: block;
      overflow: visible;
    }
  }

  .plot-label {
    position: absolute;
    left: 0;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xsmall);
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
    pointer-events: none;
  }

  .axis-names {
    position: relative;
    height: 1.25rem;
    margin-top: 0.375rem;
  }

  .axis-name {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    white-space: nowrap;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xxsmall);
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
  }

  .zero-line {
    stroke: color-mix(in srgb, var(--color-text) 35%, transparent);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .checkpoint-line {
    stroke: color-mix(in srgb, var(--color-text) 18%, transparent);
    stroke-width: 1;
    stroke-dasharray: 2 3;
    vector-effect: non-scaling-stroke;
  }

  .cursor-line {
    stroke: var(--color-text);
    stroke-width: 1;
    stroke-dasharray: 3 2;
    vector-effect: non-scaling-stroke;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xsmall);
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: var(--border-radius-xs);
  }
`;
