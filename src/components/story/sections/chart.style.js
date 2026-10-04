import { css } from "styled-components";

// What the story's distance charts share: an SVG stretched to the frame, HTML labels
// overlaid so SVG text isn't distorted (as in Terminus's ElevationProfile), a readout line.
export const chartCss = css`
  /* A segmented switch over a chart (pace: sections or stages; climbs or descents): the
     setup's chips, scaled down. */
  .level-switch {
    display: inline-flex;
    margin-bottom: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    border-radius: var(--border-radius-base);
    overflow: hidden;
  }

  .level {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    min-height: 32px;
    padding: 0.25rem 0.875rem;
    border: none;
    background: none;
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      color: var(--color-primary);
    }

    &.active {
      background: color-mix(in srgb, var(--color-text) 10%, transparent);
      color: var(--color-text);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
  }

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

    /* The value too: the bold above sets its own colour, which would otherwise win over the
       tone on the span around it. */
    [data-tone="behind"],
    [data-tone="behind"] b {
      color: var(--color-behind-text);
    }

    [data-tone="ahead"],
    [data-tone="ahead"] b {
      color: var(--color-ahead-text);
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
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
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
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
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

  .deviation-band {
    fill: color-mix(in srgb, var(--color-text) 9%, transparent);
  }

  .deviation-strip {
    fill: var(--color-accent);
  }

  .deviation-swatch {
    background: color-mix(in srgb, var(--color-text) 9%, transparent);
    border-top: 3px solid var(--color-accent);
  }

  .night-band {
    fill: color-mix(in srgb, var(--color-text) 6%, transparent);
  }

  .night-strip {
    fill: color-mix(in srgb, var(--color-text) 55%, transparent);
  }

  .night-swatch {
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
    border-bottom: 3px solid color-mix(in srgb, var(--color-text) 55%, transparent);
  }

  .cursor-line {
    stroke: var(--color-text);
    stroke-width: 1;
    stroke-dasharray: 3 2;
    vector-effect: non-scaling-stroke;
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

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xsmall);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .legend-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: var(--border-radius-xs);
  }
`;

// Rows of label, track and value, as in the cutoff buffers, the time budget and the climbs:
// one look for every per-item list, and a dumbbell (planned ring, actual dot) for the two
// that compare a planned value with an actual one.
export const rowsCss = css`
  .row-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(6rem, 11rem) 1fr minmax(3.5rem, max-content);
    align-items: center;
    gap: 0.75rem;
    border-radius: var(--border-radius-xs);

    &.active {
      background: color-mix(in srgb, var(--color-text) 7%, transparent);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-text) 7%, transparent);
    }

    /* Phone width: the label on its own line, so the track keeps the width. */
    @media (max-width: 40em) {
      grid-template-columns: 1fr minmax(3.5rem, max-content);
      gap: 0.25rem 0.75rem;

      .row-label {
        grid-column: 1 / -1;
      }
    }
  }

  .row-label,
  .row-value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xsmall);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-value {
    text-align: right;

    &[data-tone="behind"] {
      color: var(--color-behind-text);
    }

    &[data-tone="ahead"] {
      color: var(--color-ahead-text);
    }
  }

  .row-track {
    position: relative;
    display: block;
    height: 12px;
  }

  .row-zero {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 1px;
    background: color-mix(in srgb, var(--color-text) 40%, transparent);
  }

  /* A time axis over the rows: tick labels in an .axis-row, a .tick-line per tick in each
     track, and .row-zero at 0. */
  .axis-row .row-track {
    height: 1rem;
  }

  .tick-label {
    position: absolute;
    bottom: 0;
    transform: translateX(-50%);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xxsmall);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    white-space: nowrap;
  }

  .tick-line {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 1px;
    background: color-mix(in srgb, var(--color-text) 12%, transparent);
  }

  .dumbbell-link {
    position: absolute;
    top: 50%;
    height: 2px;
    margin-top: -1px;
    background: color-mix(in srgb, var(--color-text) 20%, transparent);
  }

  .dumbbell-mark {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    margin: -5px 0 0 -5px;
    border-radius: 50%;

    &.planned {
      border: 2px solid var(--color-primary);
    }

    &.actual {
      background: color-mix(in srgb, var(--color-text) 55%, transparent);

      &[data-tone="behind"] {
        background: var(--color-behind);
      }

      &[data-tone="ahead"] {
        background: var(--color-ahead);
      }
    }
  }

  .legend-swatch.dumbbell-mark {
    position: static;
    display: inline-block;
    margin: 0;
  }
`;
