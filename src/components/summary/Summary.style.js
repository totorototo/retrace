import styled from "styled-components";

export const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
`;

export const Card = styled.div`
  padding: 12px 16px;
  border-radius: var(--border-radius-md);
  background: var(--color-surface);

  dt {
    font-size: var(--font-size-tiny);
    opacity: 0.7;
  }

  dd {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-medium);
    color: var(--color-text);
  }
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-primary-text);
  }
`;
