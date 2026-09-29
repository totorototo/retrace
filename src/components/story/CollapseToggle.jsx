import { memo } from "react";

import style from "./CollapseToggle.style.js";

// Copied from Terminus: the "Show N more" button under a collapsed list.
const CollapseToggle = memo(function CollapseToggle({ className, hiddenCount, onExpand }) {
  if (hiddenCount <= 0) return null;

  return (
    <button type="button" className={className} onClick={onExpand}>
      Show {hiddenCount} more
    </button>
  );
});

export default style(CollapseToggle);
