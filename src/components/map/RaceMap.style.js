import styled from "styled-components";

// Terminus's Map style on the CSS custom properties; its why-comments explain the
// fullscreen button's safe-area offsets.
const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--border-radius-md);
  overflow: hidden;

  &:fullscreen,
  &:-webkit-full-screen {
    border-radius: 0;
  }

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
    z-index: var(--z-index-modal);
  }

  .mapboxgl-map {
    border-radius: var(--border-radius-md);
  }

  &:fullscreen .mapboxgl-map,
  &:-webkit-full-screen .mapboxgl-map,
  &.is-fullscreen .mapboxgl-map {
    border-radius: 0;
  }

  .fullscreen-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border-radius: var(--border-radius-base);
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    background: color-mix(in srgb, var(--color-background) 70%, transparent);
    color: color-mix(in srgb, var(--color-text) 75%, transparent);
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: all var(--transition-fast);
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    }
  }

  &:fullscreen .fullscreen-btn,
  &:-webkit-full-screen .fullscreen-btn,
  &.is-fullscreen .fullscreen-btn {
    top: max(calc(env(safe-area-inset-top, 0px) + 0.75rem), 3.25rem);
    right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
  }

  .map-message {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
    text-align: center;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: var(--color-text);
  }

  .offline-preview {
    width: 100%;
    height: 100%;
    display: block;
    background: var(--color-background);
  }

  .offline-badge {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.25rem 0.6rem;
    border-radius: var(--border-radius-sm);
    background: var(--color-background);
    opacity: 0.85;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: var(--color-text);
    pointer-events: none;
    white-space: nowrap;
  }

  .waypoint-marker {
    fill: var(--waypoint-color);
    stroke: var(--color-background);
    stroke-width: 1.5px;
    cursor: pointer;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  }

  /* The replay's controls: the fullscreen button's frosted look, clear of it on the right. */
  .replay {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    right: 3.75rem;
    z-index: 1;
    display: flex;
    pointer-events: none;

    & > * {
      pointer-events: auto;
    }
  }

  &:fullscreen .replay,
  &:-webkit-full-screen .replay,
  &.is-fullscreen .replay {
    top: max(calc(env(safe-area-inset-top, 0px) + 0.75rem), 3.25rem);
    left: calc(env(safe-area-inset-left, 0px) + 0.75rem);
  }

  .replay.is-active {
    flex-direction: column;
    gap: 0.375rem;
    max-width: 28rem;
    padding: 0.375rem;
    border-radius: var(--border-radius-base);
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    background: color-mix(in srgb, var(--color-background) 80%, transparent);
    backdrop-filter: blur(6px);
    pointer-events: auto;
  }

  .map-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    flex-shrink: 0;
    border-radius: var(--border-radius-base);
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    background: color-mix(in srgb, var(--color-background) 70%, transparent);
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    cursor: pointer;
    transition: all var(--transition-fast);
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    }
  }

  .replay-start {
    height: 2.25rem;
    backdrop-filter: blur(6px);
  }

  .replay-bar {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .replay-scrubber {
    flex: 1;
    min-width: 0;
    accent-color: var(--color-primary);
  }

  .replay-clock {
    min-width: 3.25rem;
    text-align: right;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
  }

  .replay-readout {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem 0.75rem;
    margin: 0;
    padding: 0 0.25rem 0.125rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-variant-numeric: tabular-nums;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);

    b {
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }

    [data-tone="behind"] {
      color: var(--color-behind-text);
    }

    [data-tone="ahead"] {
      color: var(--color-ahead-text);
    }
  }

  /* Filled is the runner, hollow the plan's: shape, not hue, tells them apart. */
  .swatch {
    display: inline-block;
    width: 0.625rem;
    height: 0.625rem;
    margin-right: 0.125rem;
    border-radius: 50%;
    vertical-align: -0.05em;

    &.runner {
      background: var(--color-primary);
    }

    &.plan {
      border: 2px solid var(--color-text);
    }
  }

  .replay-marker {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    pointer-events: none;

    &.runner {
      background: var(--marker-color);
      border: 2px solid var(--color-background);
      box-shadow:
        0 0 0 1px var(--marker-color),
        0 1px 3px rgba(0, 0, 0, 0.4);
    }

    /* The basemap is light in both variants: a white fill in the planned route's colour. */
    &.plan {
      background: rgba(255, 255, 255, 0.85);
      border: 3px solid var(--marker-color);
    }
  }

  /* Terminus's runner marker, without the pulse: it marks a place, not a live position. */
  .cursor-marker {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color-text);
    border: 2px solid var(--color-background);
    box-shadow: 0 0 0 2px var(--color-text);
    pointer-events: none;
  }
`;

export default style;
