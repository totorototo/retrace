import styled from "styled-components";

// Terminus's StoryHero, shorter: here it sits under the setup, not at the top.
const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  min-height: 70vh;
  justify-content: center;
  padding: clamp(3rem, 10vh, 6rem) clamp(1.5rem, 6vw, 4rem);
  max-width: calc(46rem + 2 * clamp(1.5rem, 6vw, 4rem));
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
    margin: 0 0 1rem;
    max-width: 20ch;
  }

  .when {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
    margin: 0 0 2.5rem;
  }

  .stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem clamp(1.5rem, 5vw, 3.5rem);
  }

  .stat-row + .stat-row {
    margin-top: 2rem;
  }

  /* Phones: three columns, so a wrapped row lines up with the one above. */
  @media (max-width: 40em) {
    .stat-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
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

  /* The takeaways: the hero's last word, quieter than its figures, the lede's measure. */
  .in-short {
    margin-top: 3rem;
    max-width: 40rem;
  }

  .in-short-title {
    display: block;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    margin-bottom: 1rem;
  }

  .in-short ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .in-short li {
    font-family: var(--font-family-sansSerif);
    font-size: var(--font-size-medium);
    line-height: 1.5;
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
    padding-left: 1rem;
    border-left: 2px solid color-mix(in srgb, var(--color-text) 15%, transparent);

    strong {
      color: var(--color-text);
      font-weight: var(--font-weight-bold);
    }
  }

  .more {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    color: var(--color-primary-text);
    text-decoration: none;
    white-space: nowrap;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
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
