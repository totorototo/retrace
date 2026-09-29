import { memo } from "react";

import { useRevealOnScroll } from "../../hooks/useRevealOnScroll.js";
import style from "./StorySection.style.js";

// Copied from Terminus. The reveal (fade + rise, once) is a CSS transition here instead of
// a react-spring spring: a one-shot tween needs no physics, nor the dependency.
const StorySection = memo(function StorySection({ className, eyebrow, title, children }) {
  const [ref, revealed] = useRevealOnScroll();

  return (
    <section ref={ref} className={className}>
      <div className={revealed ? "section-inner revealed" : "section-inner"}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {title && <h2 className="title">{title}</h2>}
        <div className="body">{children}</div>
      </div>
    </section>
  );
});

export default style(StorySection);
