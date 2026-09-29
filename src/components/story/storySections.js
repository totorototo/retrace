import StoryBudget from "./sections/StoryBudget.jsx";
import StoryCheckpoints from "./sections/StoryCheckpoints.jsx";
import StoryGap from "./sections/StoryGap.jsx";
import StoryHero from "./sections/StoryHero.jsx";
import StoryPace from "./sections/StoryPace.jsx";

// Which sections exist, in order: shared by Story (renders and observes them) and
// StoryDotNav (the jump list).
export const STORY_SECTIONS = [
  { id: "hero", label: "Overview", Component: StoryHero },
  { id: "gap", label: "Gap", Component: StoryGap },
  { id: "budget", label: "Time lost", Component: StoryBudget },
  { id: "pace", label: "Pace", Component: StoryPace },
  { id: "checkpoints", label: "Checkpoints", Component: StoryCheckpoints },
];
