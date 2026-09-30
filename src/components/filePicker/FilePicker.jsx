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

export default function FilePicker() {
  return (
    <>
      <FileRow kind="gpx" label="Plan" accept=".gpx" hint="Route with typed checkpoints" />
      <FileRow kind="fit" label="Actual" accept=".fit" hint="Activity from your watch" />
    </>
  );
}
