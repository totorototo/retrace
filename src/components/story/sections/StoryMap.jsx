import { lazy, memo } from "react";

import LazyPanel from "../../lazyPanel/LazyPanel.jsx";
import StorySection from "../StorySection.jsx";
import style from "./StoryMap.style.js";

// As in Terminus: mapbox-gl is the heaviest dependency, so its chunk loads only as this
// section nears the viewport.
const RaceMap = lazy(() => import("../../map/RaceMap.jsx"));

const StoryMap = memo(function StoryMap({ className }) {
  return (
    <div className={className}>
      <StorySection eyebrow="The place" title="Where it happened">
        <p className="lede">
          The planned route under the track that was run, off-trace stretches in red. Point along a
          chart to place it here.
        </p>
        <div className="map-frame">
          <LazyPanel>
            <RaceMap />
          </LazyPanel>
        </div>
      </StorySection>
    </div>
  );
});

export default style(StoryMap);
