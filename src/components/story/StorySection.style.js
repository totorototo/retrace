import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: block;
  width: 100%;
  padding: var(--section-block) var(--gutter);
  position: relative;

  .section-inner {
    max-width: var(--measure);
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
    margin-bottom: var(--space-3);
  }

  .title {
    font-family: var(--font-family-mono);
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.03em;
    line-height: 1;
    text-wrap: balance;
    color: var(--color-text);
    margin: 0 0 var(--space-8);
  }

  .body {
    font-family: var(--font-family-sansSerif);
  }

  /* Shared by the sections' charts. */
  .lede {
    font-size: var(--font-size-medium);
    color: var(--color-text-faint);
    max-width: 38ch;
    margin: 0 0 var(--space-10);

    strong {
      color: var(--color-text);
      font-weight: var(--font-weight-bold);
    }
  }

  .chart-frame {
    padding: var(--space-6);
    border-radius: var(--border-radius-lg);
    border: 1px solid var(--color-hairline);
  }

  /* Phones: less air around each section and inside the frames, so the charts keep the
     width. The padding-right below, not the gutter, keeps the frames clear of the dot nav. */
  @media (max-width: 40em) {
    padding-block: var(--space-12);

    .chart-frame {
      padding: var(--space-4);
      border-radius: var(--border-radius-md);
    }
  }
`;

export default style;
