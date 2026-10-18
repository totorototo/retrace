import { createStore, errorMessage } from "./store.js";

// A file as the picker hands it over: a name, a size, its bytes.
const picked = (name, size = 3) => ({
  name,
  size,
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
});

function fakeClient() {
  return {
    loadPlan: vi.fn().mockResolvedValue(null),
    loadActivity: vi.fn().mockResolvedValue(null),
    loadPlanFile: vi.fn().mockResolvedValue(null),
    summarizePlan: vi.fn().mockResolvedValue({ distance_m: 6000 }),
    summarizeActivity: vi.fn().mockResolvedValue({ samples: 10 }),
    analyze: vi.fn().mockResolvedValue({ checkpoints: [] }),
  };
}

// A promise with its resolve, for a worker answer the test releases when it wants.
function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

const file = (name) => ({ name, bytes: new Uint8Array([1, 2, 3]).buffer });

// The three files in, picked one after the other as the app's flow goes.
const loadAll = async (store) => {
  await store.getState().loadFile("gpx", picked("route.gpx"));
  await store.getState().loadFile("planFile", picked("route.plan.json"));
  await store.getState().loadFile("fit", picked("activity.fit"));
};

// The store persists the user's choices: each test starts without any.
afterEach(() => localStorage.clear());

describe("store", () => {
  it("reads picked files, hands them to the worker, and analyses them", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await loadAll(store);

    expect(client.loadPlan).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(client.loadPlanFile).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(client.loadActivity).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(store.getState().gpx).toEqual({ name: "route.gpx" });
    expect(store.getState().planFile).toEqual({ name: "route.plan.json" });
    expect(store.getState().report).toEqual({ checkpoints: [] });
    expect(store.getState().status).toBe("done");
    // The model is the plan.json's, in the worker: nothing crosses with the request.
    expect(client.analyze).toHaveBeenCalledWith();
  });

  it("with the three files in, computes only the report", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await loadAll(store);
    client.summarizePlan.mockClear();
    await store.getState().refresh();

    expect(client.summarizePlan).not.toHaveBeenCalled();
    expect(client.analyze).toHaveBeenCalledTimes(2);
    // The bytes went to the worker once, not with every request.
    expect(client.loadPlan).toHaveBeenCalledTimes(1);
    expect(client.loadActivity).toHaveBeenCalledTimes(1);
  });

  it("without the plan.json, shows each file's summary and no report", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadFiles({ gpx: file("route.gpx") });
    await store.getState().loadFiles({ fit: file("activity.fit") });

    expect(client.analyze).not.toHaveBeenCalled();
    expect(store.getState().plan).toEqual({ distance_m: 6000 });
    expect(store.getState().activity).toEqual({ samples: 10 });
    expect(store.getState().report).toBeNull();
    expect(store.getState().status).toBe("done");

    await store.getState().loadFiles({ planFile: file("route.plan.json") });
    expect(store.getState().report).toEqual({ checkpoints: [] });
    expect(store.getState().plan).toBeNull();
  });

  it("summarizes an activity on its own once", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadFiles({ fit: file("activity.fit") });
    await store.getState().loadFiles({ gpx: file("route.gpx") });

    expect(store.getState().activity).toEqual({ samples: 10 });
    expect(client.summarizeActivity).toHaveBeenCalledTimes(1);
  });

  it("names the step it is at while working, and clears it once done", async () => {
    const client = fakeClient();
    const answer = deferred();
    client.analyze.mockReturnValue(answer.promise);
    const store = createStore(() => client);
    const phases = [];
    store.subscribe(({ phase }) => phase !== phases.at(-1) && phases.push(phase));

    await store.getState().loadFile("gpx", picked("route.gpx"));
    await store.getState().loadFile("planFile", picked("route.plan.json"));
    phases.length = 0;
    const loading = store.getState().loadFile("fit", picked("activity.fit"));
    await vi.waitFor(() => expect(store.getState().phase).toBe("analysing"));
    answer.resolve({ checkpoints: [] });
    await loading;

    expect(phases).toEqual(["reading", "analysing", null]);
  });

  it("runs refreshes asked for mid-analysis once, and drops the stale result", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await loadAll(store);

    const first = deferred();
    client.analyze.mockReset().mockReturnValueOnce(first.promise);
    client.analyze.mockResolvedValue({ checkpoints: ["latest"] });
    const done = store.getState().refresh();
    store.getState().refresh();
    store.getState().refresh();
    first.resolve({ checkpoints: ["stale"] });
    await done;

    expect(client.analyze).toHaveBeenCalledTimes(2);
    expect(store.getState().report).toEqual({ checkpoints: ["latest"] });
    expect(store.getState().status).toBe("done");
  });

  it("drops an analysis still running when new files come in", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await loadAll(store);

    const stale = deferred();
    client.analyze.mockReturnValueOnce(stale.promise);
    store.getState().refresh();
    const loading = store.getState().loadFiles({ fit: file("other.fit") });
    stale.resolve({ checkpoints: ["old files"] });
    await loading;

    expect(store.getState().fit).toEqual({ name: "other.fit" });
    expect(store.getState().report).toEqual({ checkpoints: [] });
  });

  it("turns away a file too large to read", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadFile("fit", picked("huge.fit", 300 * 1024 * 1024));

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("huge.fit is too large");
    expect(client.loadActivity).not.toHaveBeenCalled();
  });

  it("reports worker errors", async () => {
    const client = fakeClient();
    client.analyze.mockRejectedValue(new Error("ActivityNotOnRoute"));
    const store = createStore(() => client);

    await loadAll(store);

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("ActivityNotOnRoute");
  });

  it("explains a plan.json for another route", async () => {
    const client = fakeClient();
    client.summarizePlan.mockRejectedValue(new Error("Course mismatch"));
    const store = createStore(() => client);
    await store.getState().loadFile("planFile", picked("other.plan.json"));
    await store.getState().loadFile("gpx", picked("route.gpx"));
    expect(store.getState().error).toMatch(/made for another GPX/);
  });

  it("forgets the plan.json in the worker on reset", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await store.getState().loadFile("planFile", picked("route.plan.json"));
    store.getState().reset();
    expect(client.loadPlanFile).toHaveBeenLastCalledWith(null);
    expect(store.getState().planFile).toBeNull();
  });
});

describe("errorMessage", () => {
  it("explains the plan.json errors by name, as Zig or as Zigar's words", () => {
    expect(errorMessage("CourseMismatch")).toBe(errorMessage("Course mismatch"));
    expect(errorMessage("PlanStale")).toMatch(/Rebuild it in Regimen/);
    expect(errorMessage("Plan invalid")).toMatch(/edited by hand/);
    expect(errorMessage("SchemaVersionUnsupported")).toMatch(/newer Regimen/);
  });

  it("passes any other error through", () => {
    expect(errorMessage("ActivityNotOnRoute")).toBe("ActivityNotOnRoute");
  });
});

describe("theme", () => {
  const prefers = (dark) =>
    vi.stubGlobal("matchMedia", (query) => ({ matches: dark && query.includes("dark") }));

  afterEach(() => vi.unstubAllGlobals());

  it("starts from the system's variant", () => {
    prefers(true);
    expect(createStore(fakeClient).getState().theme).toBe("dark");
    prefers(false);
    expect(createStore(fakeClient).getState().theme).toBe("light");
  });

  it("remembers the variant picked over the system's", () => {
    prefers(true);
    const store = createStore(fakeClient);
    store.getState().toggleTheme();
    expect(store.getState().theme).toBe("light");
    expect(createStore(fakeClient).getState().theme).toBe("light");
  });

  it("still switches when storage is blocked", () => {
    prefers(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const store = createStore(fakeClient);
    store.getState().toggleTheme();
    expect(store.getState().theme).toBe("dark");
    vi.restoreAllMocks();
  });
});

describe("persistence", () => {
  it("remembers the theme, not the files or what they made", async () => {
    const store = createStore(fakeClient);
    await loadAll(store);
    store.getState().toggleTheme();
    const theme = store.getState().theme;

    const next = createStore(fakeClient).getState();
    expect(next.theme).toBe(theme);
    expect(next.gpx).toBeNull();
    expect(next.planFile).toBeNull();
    expect(next.report).toBeNull();
  });

  it("drops the pickers' settings an earlier retrace saved", () => {
    localStorage.setItem(
      "retrace-storage",
      JSON.stringify({
        state: { theme: "dark", settings: { pace_base_s_per_km: 420 } },
        version: 0,
      }),
    );
    const state = createStore(fakeClient).getState();
    expect(state.theme).toBe("dark");
    expect(state).not.toHaveProperty("settings");
  });
});
