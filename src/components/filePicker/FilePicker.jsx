import useStore from "../../store/store.js";
import { FileName, Input } from "./FilePicker.style.js";

// Files are read in JavaScript and their bytes handed to the worker; nothing is uploaded.
// Each is a row of Setup's ledger; the whole row is the label, so any of it opens the picker.
function FileRow({ kind, label, accept, hint }) {
  const file = useStore((state) => state[kind]);
  const loadFile = useStore((state) => state.loadFile);

  return (
    <label className="row">
      <span className="row-label">{label}</span>
      <FileName $loaded={!!file} data-testid={`${kind}-name`}>
        {file?.name ?? hint}
      </FileName>
      <span className="chip">{file ? "Replace" : `Choose ${accept}`}</span>
      <Input
        type="file"
        accept={accept}
        data-testid={`${kind}-input`}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) loadFile(kind, selected);
        }}
      />
    </label>
  );
}

// The plan.json row: optional, so it can be removed, which a file row can't. Its own row,
// not a label: a Remove button inside the label would also open the picker.
function PlanFileRow() {
  const planFile = useStore((state) => state.planFile);
  const loadFile = useStore((state) => state.loadFile);
  const removePlanFile = useStore((state) => state.removePlanFile);

  return (
    <div className="row">
      <span className="row-label">Plan</span>
      <FileName $loaded={!!planFile} data-testid="planFile-name">
        {planFile?.name ?? "plan.json from Regimen (optional)"}
      </FileName>
      <span className="row-actions">
        <label className="chip">
          {planFile ? "Replace" : "Choose .json"}
          <Input
            type="file"
            accept=".json,application/json"
            data-testid="planFile-input"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) loadFile("planFile", selected);
              event.target.value = "";
            }}
          />
        </label>
        {planFile && (
          <button type="button" className="chip" onClick={removePlanFile}>
            Remove
          </button>
        )}
      </span>
    </div>
  );
}

export default function FilePicker() {
  return (
    <>
      <FileRow kind="gpx" label="Route" accept=".gpx" hint="Route with typed checkpoints" />
      <PlanFileRow />
      <FileRow kind="fit" label="Actual" accept=".fit" hint="Activity from your watch" />
    </>
  );
}
