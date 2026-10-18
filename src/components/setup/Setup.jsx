import { memo, useState } from "react";

import useStore from "../../store/store.js";
import { MARK_PATH } from "../../theme/mark.js";
import FilePicker from "../filePicker/FilePicker.jsx";
import LoadingSpinner from "../loadingSpinner/LoadingSpinner.jsx";
import { modelText } from "../planModel/modelText.js";
import PlanModel from "../planModel/PlanModel.jsx";
import Summary from "../summary/Summary.jsx";
import style from "./Setup.style.js";

// The loader's label for each step of the work.
const PHASE_LABELS = {
  reading: "Reading the file…",
  // One file in: its summary. Both: straight to the comparison.
  parsing: "Parsing the race file…",
  analysing: "Comparing the race with the plan…",
};

// The files the story is made from, folded to one row once it is there.
function Recap({ onChange }) {
  const gpx = useStore((state) => state.gpx);
  const fit = useStore((state) => state.fit);
  const planFile = useStore((state) => state.planFile);
  const settings = useStore((state) => state.report?.settings);

  return (
    <div className="ledger">
      <div className="row">
        <span className="row-label">Race</span>
        <div>
          <span className="recap-files">
            {gpx?.name} <span className="recap-vs">vs</span> {fit?.name}
          </span>
          <p className="row-note">
            {planFile?.name}: {modelText(settings)}
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
  const missingPlan = useStore((state) => state.gpx && state.fit && !state.planFile);
  // why: folded by default once there is a report, so the story's hero opens the page; kept
  // open while changing, since swapping a file drops the report until the new one is in.
  const [changing, setChanging] = useState(false);
  const open = !report || changing;
  const working = status === "working";

  return (
    <div className={className}>
      <div className="setup-inner">
        <header className="masthead">
          <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
            <path d={MARK_PATH} fillRule="evenodd" />
          </svg>
          <h1>
            <span className="wordmark-re">re</span>trace
          </h1>
        </header>

        {!report && (
          <div className="intro">
            <span className="eyebrow">Plan vs actual</span>
            <h2 className="title">Your race, against the plan</h2>
            <p className="lede">
              The route, the plan.json you made for it in Regimen, and the activity from your watch.
              Nothing leaves this device.
            </p>
          </div>
        )}

        {/* The rows stay while a file is read: the loader goes below them. */}
        {open ? (
          <>
            <div className="ledger">
              <FilePicker />
              <PlanModel />
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
        {missingPlan && status === "done" && (
          <p className="status" data-testid="missing-plan">
            Add the route&apos;s plan.json from Regimen to compare the race with it.
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
