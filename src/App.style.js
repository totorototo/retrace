import styled from "styled-components";

export const Layout = styled.main`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 48px;
`;

export const Header = styled.header`
  display: flex;
  align-items: baseline;
  gap: 12px;

  h1 {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xlarge);
    color: var(--color-primary);
    letter-spacing: -0.02em;
  }

  p {
    color: var(--color-text);
    opacity: 0.7;
    font-size: var(--font-size-small);
  }
`;

export const Status = styled.p`
  font-family: var(--font-family-mono);
  font-size: var(--font-size-small);
  color: ${({ $error }) => ($error ? "var(--color-accent-text)" : "var(--color-secondary-text)")};
`;
