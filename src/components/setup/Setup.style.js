import styled from "styled-components";

// On the story's measure and gutters (StorySection, StoryHero), so the setup and the story
// share a left edge. The rows are styled here, as StorySection styles its sections' charts:
// FilePicker and PlanModel only emit the class names.
const style = (Component) => styled(Component)`
  padding: 0 var(--gutter);

  .setup-inner {
    max-width: var(--measure);
    margin: 0 auto;
  }

  /* Level with the theme toggle: same top offset, same 44px height. */
  .masthead {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: 0.625rem;
    margin-top: calc(env(safe-area-inset-top, 0px) + 1.25rem);

    /* The arrowhead starts 6 of the mark's 64 in: pulled back to line up with the text below. */
    .mark {
      width: 44px;
      height: 44px;
      flex: none;
      margin-left: calc(-44px * 6 / 64);
    }

    /* One ink, as the favicon's: dark's primary is its gold, light's its blue. */
    .mark path {
      fill: var(--color-primary);
    }

    .wordmark-re {
      color: var(--color-text-muted);
    }

    h1 {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-xlarge);
      font-weight: var(--font-weight-bold);
      letter-spacing: -0.04em;
      line-height: 1;
      color: var(--color-text);
    }
  }

  /* The suite's start: the eyebrow as far under the masthead as in the other apps. */
  .intro {
    padding: clamp(3rem, 12vh, 6rem) 0 0.5rem;
  }

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

  .title {
    font-family: var(--font-family-mono);
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--color-text);
    margin: 0 0 1rem;
    max-width: 16ch;
  }

  .lede {
    color: var(--color-text-muted);
    max-width: 38ch;
  }

  /* The files, as Terminus's and Waymark's start: one narrow list of rows, each an icon and
     what it opens, the file's name once it is in. */
  .choices {
    max-width: 28rem;
    /* 2.5rem under the lede, with the intro's 0.5rem. */
    margin-top: 2rem;
    border-top: 1px solid var(--color-hairline);
  }

  .choice {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-height: 44px;
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-hairline);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    line-height: normal;
    color: var(--color-text);
    cursor: pointer;
    transition: color var(--transition-base);
    -webkit-tap-highlight-color: transparent;

    svg {
      flex: none;
    }

    &:hover {
      color: var(--color-primary-text);
    }

    &:active {
      opacity: 0.7;
    }
  }

  .choice-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The plan's model under the list, in the start's note type. */
  .model {
    max-width: 40ch;
    margin-top: 1.25rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    line-height: 1.5;
    color: var(--color-text-muted);

    [data-testid="plan-model"] {
      color: var(--color-text);
    }
  }

  .model-label {
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .model-source {
    display: block;
  }

  .ledger {
    margin-top: 2rem;
    border-bottom: 1px solid var(--color-hairline);
  }

  .row {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 1.5rem;
    row-gap: 0.75rem;
    padding: 1.25rem 0;
    border-top: 1px solid var(--color-hairline);
    position: relative;
  }

  .row-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
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
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
  }

  .row-note {
    margin-top: 0.5rem;
    font-size: var(--font-size-small);
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
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
    border: 1px solid var(--color-control-border);
    background: none;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    white-space: nowrap;
    cursor: pointer;
    transition: all var(--transition-base);

    /* Terminus's hover for an outlined button (its retry and fullscreen buttons). */
    &:hover {
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
      color: var(--color-primary-text);
    }
  }

  .status {
    margin-top: 1rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: color-mix(in srgb, var(--color-text) 85%, transparent);

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
  }
`;

export default style;
