import { Activity } from "@styled-icons/feather/Activity";
import { Check } from "@styled-icons/feather/Check";
import { FileText } from "@styled-icons/feather/FileText";
import { FolderPlus } from "@styled-icons/feather/FolderPlus";

import useStore from "../../store/store.js";
import { Input } from "./FilePicker.style.js";

// Files are read in JavaScript and their bytes handed to the worker; nothing is uploaded.
// Each is a row of Setup's list, as Terminus's and Waymark's start: the whole row is the
// label, so any of it opens the picker. A file in, the row shows its name and a check.
function FileRow({ kind, label, accept, Icon }) {
  const file = useStore((state) => state[kind]);
  const loadFile = useStore((state) => state.loadFile);

  return (
    <label className={`choice${file ? " is-loaded" : ""}`}>
      {file ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
      <span className="choice-label" data-testid={`${kind}-name`}>
        {file?.name ?? label}
      </span>
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
      <FileRow kind="gpx" label="Open GPX" accept=".gpx" Icon={FolderPlus} />
      <FileRow kind="planFile" label="Open plan.json" accept=".json" Icon={FileText} />
      <FileRow kind="fit" label="Open FIT" accept=".fit" Icon={Activity} />
    </>
  );
}
