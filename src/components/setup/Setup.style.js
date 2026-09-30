import styled from "styled-components";

// On the story's measure and gutters (StorySection, StoryHero), so the setup and the story
// share a left edge. The rows are styled here, as StorySection styles its sections' charts:
// FilePicker and SettingsForm only emit the class names.
const style = (Component) => styled(Component)`
  padding: 0 clamp(1.5rem, 6vw, 4rem);

  .setup-inner {
    max-width: 46rem;
    margin: 0 auto;
  }

  /* Level with the theme toggle: same top offset, same 44px height. */
  .masthead {
    display: flex;
    align-items: center;
    min-height: 44px;
    margin-top: calc(env(safe-area-inset-top, 0px) + 1.25rem);

    h1 {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xlarge);
      font-weight: var(--font-weight-bold);
      letter-spacing: -0.04em;
      line-height: 1;
      color: var(--color-primary-text);
    }
  }

  .intro {
    padding: clamp(3rem, 10vh, 5rem) 0 0.5rem;
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
    margin: 0 0 1.5rem;
    max-width: 16ch;
  }

  .lede {
    font-size: var(--font-size-medium);
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    max-width: 38ch;
  }

  .ledger {
    margin-top: 2rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-text) 10%, transparent);
  }

  .row {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 1.5rem;
    row-gap: 0.75rem;
    padding: 1.25rem 0;
    border-top: 1px solid color-mix(in srgb, var(--color-text) 10%, transparent);
    position: relative;
  }

  /* A file row is one big label: hovering anywhere on it is hovering its chip. */
  label.row {
    cursor: pointer;

    &:hover .chip {
      border-color: color-mix(in srgb, var(--color-text) 35%, transparent);
      color: var(--color-text);
    }
  }

  .row-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
  }

  /* A row whose body is wide (the pickers) gives it the action column too. */
  .row-body--wide {
    grid-column: 2 / -1;
  }

  .ledger-end {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .recap-files {
    display: block;
    font-family: var(--font-family-mono);
    font-size: var(--font-size);
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recap-vs {
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
  }

  .row-note {
    margin-top: 0.5rem;
    font-size: var(--font-size-small);
    color: color-mix(in srgb, var(--color-text) 55%, transparent);
  }

  /* Terminus's StoryPace profile buttons: the pickers, and every other action in the rows. */
  .chip {
    display: inline-flex;
    align-items: center;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    min-height: 44px;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius-base);
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    background: none;
    color: color-mix(in srgb, var(--color-text) 65%, transparent);
    white-space: nowrap;
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      border-color: color-mix(in srgb, var(--color-text) 35%, transparent);
    }

    &.active {
      border-color: var(--color-secondary);
      color: var(--color-secondary-text);
    }
  }

  .status {
    margin-top: 1rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: var(--color-secondary-text);

    &[role="alert"] {
      color: var(--color-accent-text);
    }
  }

  /* Phones: the label goes above its row, so the body gets the full width. */
  @media (max-width: 40em) {
    .row {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .row-label {
      grid-column: 1 / -1;
    }

    .row-body--wide {
      grid-column: 1 / -1;
    }
  }
`;

export default style;
