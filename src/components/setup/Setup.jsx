import { memo, useState } from "react";

import useStore from "../../store/store.js";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import { profileOf, stopOf } from "../settingsForm/PaceSettings.constants.js";
import SettingsForm from "../settingsForm/SettingsForm.jsx";
import Summary from "../summary/Summary.jsx";
import style from "./Setup.style.js";

// The loader's label for each step of the work.
const PHASE_LABELS = {
  reading: "Reading the race files…",
  parsing: "Parsing the plan and the activity…",
  analysing: "Comparing the race with the plan…",
};

// The race and the settings the story is made from, folded to one row once it is there.
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
  const phase = useStore((state) => state.phase);
  const error = useStore((state) => state.error);
  // why: folded by default once there is a report, so the story's hero opens the page.
  const [changing, setChanging] = useState(false);
  const open = !report || changing;
  const working = status === "working";

  return (
    <div className={className}>
      <div className="setup-inner">
        <header className="masthead">
          <h1>retrace</h1>
        </header>

        {!report && (
          <div className="intro">
            <span className="eyebrow">Plan vs actual</span>
            <h2 className="title">A race, against its plan</h2>
            <p className="lede">
              The Grand Raid des Pyrénées 2026 Ultra Tour: the route planned in Terminus, against
              the activity from the watch, with the settings the plan was made with.
            </p>
          </div>
        )}

        {/* why: on first load the loader takes the settings' place, so it is in view on a
            phone; once there is a story, the settings stay and the loader goes below them. */}
        {working && !report ? null : open ? (
          <>
            <div className="ledger">
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

        {working && <LoadingSpinner label={PHASE_LABELS[phase] ?? "Working…"} />}
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
