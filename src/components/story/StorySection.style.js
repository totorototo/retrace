import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;
  width: 100%;
  padding: clamp(4rem, 14vh, 7rem) clamp(1.25rem, 6vw, 4rem);
  position: relative;

  .section-inner {
    max-width: 46rem;
    margin: 0 auto;
    opacity: 0;
    transform: translateY(28px);
    transition:
      opacity 0.6s ease,
      transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);

    &.revealed {
      opacity: 1;
      transform: none;
    }
  }

  .eyebrow {
    display: block;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    margin-bottom: 0.75rem;
  }

  .title {
    font-family: var(--font-family-mono);
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--color-text);
    margin: 0 0 2rem;
  }

  .body {
    font-family: var(--font-family-sansSerif);
  }

  /* Shared by the sections' charts. */
  .lede {
    font-size: var(--font-size-medium);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    max-width: 38ch;
    margin: 0 0 2.5rem;

    strong {
      color: var(--color-text);
      font-weight: var(--font-weight-bold);
    }
  }

  .chart-frame {
    padding: 1.5rem;
    border-radius: var(--border-radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  }
`;

export default style;
