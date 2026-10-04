import { createStore, DEFAULT_SETTINGS } from "./store.js";

const FILES = {
  gpx: { name: "route.gpx", url: "/demo/route.gpx" },
  fit: { name: "activity.fit", url: "/demo/activity.fit" },
};

// fetch answering every URL with a few bytes, or with `status` for the ones in `failing`.
const serve = (failing = [], status = 404) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => ({
      ok: !failing.includes(url),
      status: failing.includes(url) ? status : 200,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    })),
  );

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

describe("store", () => {
  beforeEach(() => serve());
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the demo race, hands it to the worker, and analyses it", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadDemo(FILES);

    expect(fetch).toHaveBeenCalledWith("/demo/route.gpx");
    expect(fetch).toHaveBeenCalledWith("/demo/activity.fit");
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

    await store.getState().loadDemo(FILES);
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

    const loading = store.getState().loadDemo(FILES);
    await vi.waitFor(() => expect(store.getState().phase).toBe("analysing"));
    answer.resolve({ checkpoints: [] });
    await loading;

    expect(phases).toEqual(["reading", "analysing", null]);
  });

  it("runs settings picked mid-analysis once, on the latest, and drops the stale result", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await store.getState().loadDemo(FILES);

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
    await store.getState().loadDemo(FILES);

    const stale = deferred();
    client.analyze.mockReturnValueOnce(stale.promise);
    store.getState().setSettings({ pace_base_s_per_km: 365 });
    const loading = store.getState().loadFiles({ fit: file("other.fit") });
    stale.resolve({ checkpoints: ["old files"] });
    await loading;

    expect(store.getState().fit).toEqual({ name: "other.fit" });
    expect(store.getState().report).toEqual({ checkpoints: [] });
  });

  it("reports a file it could not fetch", async () => {
    serve(["/demo/activity.fit"]);
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadDemo(FILES);

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("activity.fit: HTTP 404");
    expect(store.getState().phase).toBeNull();
    expect(client.loadPlan).not.toHaveBeenCalled();
    expect(client.analyze).not.toHaveBeenCalled();
  });

  it("reports worker errors", async () => {
    const client = fakeClient();
    client.analyze.mockRejectedValue(new Error("ActivityNotOnRoute"));
    const store = createStore(() => client);

    await store.getState().loadDemo(FILES);

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("ActivityNotOnRoute");
  });
});

describe("theme", () => {
  const prefers = (dark) =>
    vi.stubGlobal("matchMedia", (query) => ({ matches: dark && query.includes("dark") }));

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

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
