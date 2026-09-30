import Footer from "./components/footer/Footer.jsx";
import Setup from "./components/setup/Setup.jsx";
import Story from "./components/story/Story.jsx";
import ThemeToggle from "./components/themeToggle/ThemeToggle.jsx";
import useStore from "./store/store.js";

export default function App() {
  const report = useStore((state) => state.report);

  // The footer outside <main>: only there is it the page's footer (contentinfo).
  return (
    <>
      <main>
        <ThemeToggle />
        <Setup />
        {/* Full width: the story's sections set their own measure, as in Terminus. */}
        {report && <Story />}
      </main>
      <Footer />
    </>
  );
}
