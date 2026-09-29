import styled from "styled-components";

// Terminus's StoryHero, shorter: here it sits under the file pickers, not at the top.
const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  min-height: 70vh;
  justify-content: center;
  padding: clamp(3rem, 10vh, 6rem) clamp(1.25rem, 6vw, 4rem);
  max-width: calc(46rem + 2 * clamp(1.25rem, 6vw, 4rem));
  margin: 0 auto;

  .eyebrow {
    display: block;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    margin-bottom: 1rem;
  }

  .name {
    font-family: var(--font-family-mono);
    font-size: clamp(2.5rem, 9vw, 5.5rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.04em;
    line-height: 0.98;
    color: var(--color-text);
    margin: 0 0 2.5rem;
    max-width: 20ch;
  }

  .stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(1.5rem, 5vw, 3.5rem);

    & + & {
      margin-top: 2rem;
    }
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-family: var(--font-family-mono);
    font-size: clamp(1.25rem, 3vw, 1.75rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.02em;
    line-height: 1;
    color: var(--color-text);

    &[data-tone="behind"] {
      color: var(--color-behind-text);
    }

    &[data-tone="ahead"] {
      color: var(--color-ahead-text);
    }
  }

  .stat-row--primary .stat-value {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    color: var(--color-primary-text);

    &[data-tone="behind"] {
      color: var(--color-behind-text);
    }

    &[data-tone="ahead"] {
      color: var(--color-ahead-text);
    }
  }

  .stat-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 0.375rem;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
  }
`;

export default style;
