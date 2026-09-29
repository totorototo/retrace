import { Controls, Header, Status } from "./App.style.js";
import FilePicker from "./components/filePicker/FilePicker.jsx";
import SettingsForm from "./components/settingsForm/SettingsForm.jsx";
import Story from "./components/story/Story.jsx";
import Summary from "./components/summary/Summary.jsx";
import useStore from "./store/store.js";

export default function App() {
  const status = useStore((state) => state.status);
  const error = useStore((state) => state.error);
  const report = useStore((state) => state.report);

  return (
    <main>
      <Controls>
        <Header>
          <h1>retrace</h1>
          <p>plan vs actual</p>
        </Header>
        <FilePicker />
        <SettingsForm />
        {status === "working" && <Status role="status">Analysing…</Status>}
        {status === "error" && (
          <Status role="alert" $error data-testid="error">
            {error}
          </Status>
        )}
        {!report && <Summary />}
      </Controls>
      {/* Full width: the story's sections set their own measure, as in Terminus. */}
      {report && <Story />}
    </main>
  );
}
