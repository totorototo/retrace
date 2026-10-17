import { createStore, DEFAULT_SETTINGS } from "./store.js";

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

// Both files in, picked one after the other as the app's flow goes.
const loadBoth = async (store) => {
  await store.getState().loadFile("gpx", picked("route.gpx"));
  await store.getState().loadFile("fit", picked("activity.fit"));
};

// The store persists the user's choices: each test starts without any.
afterEach(() => localStorage.clear());

describe("store", () => {
  it("reads picked files, hands them to the worker, and analyses them", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await loadBoth(store);

    expect(client.loadPlan).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(client.loadActivity).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(store.getState().gpx).toEqual({ name: "route.gpx" });
    expect(store.getState().report).toEqual({ checkpoints: [] });
    expect(store.getState().status).toBe("done");
    expect(client.analyze).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  it("with both files in, computes only the report", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await loadBoth(store);
    // The plan's summary was shown while it was the only file.
    client.summarizePlan.mockClear();
    await store.getState().setSettings({ pace_base_s_per_km: 420 });

    expect(client.summarizePlan).not.toHaveBeenCalled();
    expect(client.summarizeActivity).not.toHaveBeenCalled();
    expect(client.analyze).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      pace_base_s_per_km: 420,
    });
    // The bytes went to the worker once, not with every request.
    expect(client.loadPlan).toHaveBeenCalledTimes(1);
    expect(client.loadActivity).toHaveBeenCalledTimes(1);
  });

  it("one file at a time: the plan's summary, then the report", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadFiles({ gpx: file("route.gpx") });
    expect(store.getState().plan).toEqual({ distance_m: 6000 });
    expect(store.getState().report).toBeNull();
    expect(client.analyze).not.toHaveBeenCalled();

    await store.getState().setSettings({ pace_base_s_per_km: 420 });
    expect(client.summarizePlan).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      pace_base_s_per_km: 420,
    });

    await store.getState().loadFiles({ fit: file("activity.fit") });
    expect(store.getState().report).toEqual({ checkpoints: [] });
    expect(client.summarizeActivity).not.toHaveBeenCalled();
  });

  it("summarizes an activity on its own once, whatever the settings", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadFiles({ fit: file("activity.fit") });
    await store.getState().setSettings({ life_base_stop_s: 1800 });

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
    phases.length = 0;
    const loading = store.getState().loadFile("fit", picked("activity.fit"));
    await vi.waitFor(() => expect(store.getState().phase).toBe("analysing"));
    answer.resolve({ checkpoints: [] });
    await loading;

    expect(phases).toEqual(["reading", "analysing", null]);
  });

  it("runs settings picked mid-analysis once, on the latest, and drops the stale result", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await loadBoth(store);

    const first = deferred();
    client.analyze.mockReset().mockReturnValueOnce(first.promise);
    client.analyze.mockResolvedValue({ checkpoints: ["latest"] });
    const done = store.getState().setSettings({ pace_base_s_per_km: 365 });
    store.getState().setSettings({ pace_base_s_per_km: 330 });
    store.getState().setSettings({ pace_base_s_per_km: 300 });
    first.resolve({ checkpoints: ["stale"] });
    await done;

    expect(client.analyze).toHaveBeenCalledTimes(2);
    expect(client.analyze).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      pace_base_s_per_km: 300,
    });
    expect(store.getState().report).toEqual({ checkpoints: ["latest"] });
    expect(store.getState().status).toBe("done");
  });

  it("drops an analysis still running when new files come in", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await loadBoth(store);

    const stale = deferred();
    client.analyze.mockReturnValueOnce(stale.promise);
    store.getState().setSettings({ pace_base_s_per_km: 365 });
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

  it("falls back to the settings the story was made with when new ones fail", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await loadBoth(store);

    client.analyze.mockRejectedValueOnce(new Error("TraceTooShort"));
    await store.getState().setSettings({ pace_base_s_per_km: 300 });

    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(store.getState().report).toEqual({ checkpoints: [] });
    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("TraceTooShort");
  });

  it("drops the plan's summary once the activity is in, rather than leave it stale", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await store.getState().loadFiles({ gpx: file("route.gpx") });
    expect(store.getState().plan).toEqual({ distance_m: 6000 });

    await store.getState().loadFiles({ fit: file("activity.fit") });
    expect(store.getState().plan).toBeNull();
  });

  it("reports worker errors", async () => {
    const client = fakeClient();
    client.analyze.mockRejectedValue(new Error("ActivityNotOnRoute"));
    const store = createStore(() => client);

    await loadBoth(store);

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("ActivityNotOnRoute");
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
  it("remembers the settings picked, not the files or what they made", async () => {
    const store = createStore(fakeClient);
    await loadBoth(store);
    await store.getState().setSettings({ pace_base_s_per_km: 420 });

    const next = createStore(fakeClient).getState();
    expect(next.settings).toEqual({ ...DEFAULT_SETTINGS, pace_base_s_per_km: 420 });
    expect(next.gpx).toBeNull();
    expect(next.report).toBeNull();
  });

  it("keeps a new setting's default over settings saved without it", () => {
    localStorage.setItem(
      "retrace-storage",
      JSON.stringify({ state: { settings: { pace_base_s_per_km: 420 } }, version: 0 }),
    );
    expect(createStore(fakeClient).getState().settings).toEqual({
      ...DEFAULT_SETTINGS,
      pace_base_s_per_km: 420,
    });
  });
});
