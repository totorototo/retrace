import styled from "styled-components";

// StoryHero's stats, smaller: the value over its label, no cards.
export const Cards = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--stat-gap);
`;

export const Card = styled.div`
  dl {
    display: flex;
    flex-direction: column-reverse;
  }

  dt {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: var(--space-2);
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
  }

  dd {
    font-family: var(--font-family-mono);
    font-size: clamp(1.25rem, 3vw, 1.75rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.02em;
    line-height: 1;
    color: var(--color-text);
  }
`;

export const Section = styled.section`
  margin-top: var(--space-10);

  h2 {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    margin-bottom: var(--space-4);
  }
`;
