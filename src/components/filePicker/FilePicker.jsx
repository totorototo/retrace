import useStore from "../../store/store.js";
import { Row, Slot } from "./FilePicker.style.js";

// Files are read in JavaScript and their bytes handed to the worker; nothing is uploaded.
function FileSlot({ kind, label, accept, hint }) {
  const file = useStore((state) => state[kind]);
  const loadFile = useStore((state) => state.loadFile);

  return (
    <Slot $loaded={!!file}>
      <span>{label}</span>
      <span data-testid={`${kind}-name`}>{file?.name ?? hint}</span>
      <input
        type="file"
        accept={accept}
        data-testid={`${kind}-input`}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) loadFile(kind, selected);
        }}
      />
    </Slot>
  );
}

export default function FilePicker() {
  return (
    <Row>
      <FileSlot kind="gpx" label="Plan · GPX" accept=".gpx" hint="Route with typed checkpoints" />
      <FileSlot kind="fit" label="Actual · FIT" accept=".fit" hint="Activity from your watch" />
    </Row>
  );
}
