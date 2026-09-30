import { memo, useState } from "react";

import useStore from "../../store/store.js";
import FilePicker from "../filePicker/FilePicker.jsx";
import { profileOf, stopOf } from "../settingsForm/PaceSettings.constants.js";
import SettingsForm from "../settingsForm/SettingsForm.jsx";
import Summary from "../summary/Summary.jsx";
import style from "./Setup.style.js";

// What the story is made from, folded to one row once the story is there.
function Recap({ onChange }) {
  const gpx = useStore((state) => state.gpx);
  const fit = useStore((state) => state.fit);
  const settings = useStore((state) => state.settings);
  const profile = profileOf(settings);
  const stop = stopOf(settings);

  return (
    <div className="ledger">
      <div className="row">
        <span className="row-label">Race</span>
        <div>
          <span className="recap-files">
            {gpx?.name} <span className="recap-vs">vs</span> {fit?.name}
          </span>
          <p className="row-note">
            {profile?.label ?? "Custom"} profile · {stop?.label ?? "custom"} at each LifeBase
          </p>
        </div>
        <button type="button" className="chip" onClick={onChange} aria-expanded="false">
          Change
        </button>
      </div>
    </div>
  );
}

const Setup = memo(function Setup({ className }) {
  const report = useStore((state) => state.report);
  const status = useStore((state) => state.status);
  const error = useStore((state) => state.error);
  // why: folded by default once there is a report, so the story's hero opens the page; kept
  // open while changing, since swapping a file drops the report until the new one is in.
  const [changing, setChanging] = useState(false);
  const open = !report || changing;

  return (
    <div className={className}>
      <div className="setup-inner">
        <header className="masthead">
          <h1>retrace</h1>
        </header>

        {!report && (
          <div className="intro">
            <span className="eyebrow">Plan vs actual</span>
            <h2 className="title">Your race, against the plan</h2>
            <p className="lede">
              The route you planned in Terminus, the activity from your watch, and the settings the
              plan was made with. Nothing leaves this device.
            </p>
          </div>
        )}

        {open ? (
          <>
            <div className="ledger">
              <FilePicker />
              <SettingsForm />
            </div>
            {report && (
              <div className="ledger-end">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setChanging(false)}
                  aria-expanded="true"
                >
                  Done
                </button>
              </div>
            )}
          </>
        ) : (
          <Recap onChange={() => setChanging(true)} />
        )}

        {status === "working" && (
          <p className="status" role="status">
            Analysing…
          </p>
        )}
        {status === "error" && (
          <p className="status" role="alert" data-testid="error">
            {error}
          </p>
        )}
        {!report && <Summary />}
      </div>
    </div>
  );
});

export default style(Setup);
