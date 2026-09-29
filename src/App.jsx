import { Header, Layout, Status } from "./App.style.js";
import FilePicker from "./components/filePicker/FilePicker.jsx";
import SettingsForm from "./components/settingsForm/SettingsForm.jsx";
import Summary from "./components/summary/Summary.jsx";
import useStore from "./store/store.js";

export default function App() {
  const status = useStore((state) => state.status);
  const error = useStore((state) => state.error);

  return (
    <Layout>
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
      <Summary />
    </Layout>
  );
}
