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
    summarizePlan: vi.fn().mockResolvedValue({ distance_m: 6000 }),
    summarizeActivity: vi.fn().mockResolvedValue({ samples: 10 }),
    analyze: vi.fn().mockResolvedValue({ checkpoints: [] }),
  };
}

describe("store", () => {
  beforeEach(() => serve());
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the demo race and analyses it", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadDemo(FILES);

    expect(fetch).toHaveBeenCalledWith("/demo/route.gpx");
    expect(fetch).toHaveBeenCalledWith("/demo/activity.fit");
    expect(store.getState().gpx.name).toBe("route.gpx");
    expect(store.getState().plan).toEqual({ distance_m: 6000 });
    expect(store.getState().activity).toEqual({ samples: 10 });
    expect(store.getState().report).toEqual({ checkpoints: [] });
    expect(store.getState().status).toBe("done");
    expect(client.analyze).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      DEFAULT_SETTINGS,
    );
  });

  it("names the step it is at while working, and clears it once done", async () => {
    const client = fakeClient();
    let finish;
    client.analyze.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const store = createStore(() => client);
    const phases = [];
    store.subscribe(({ phase }) => phase !== phases.at(-1) && phases.push(phase));

    const loading = store.getState().loadDemo(FILES);
    await vi.waitFor(() => expect(store.getState().phase).toBe("analysing"));
    finish({ checkpoints: [] });
    await loading;

    expect(phases).toEqual(["reading", "parsing", "analysing", null]);
  });

  it("reruns the analysis with new settings", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await store.getState().loadDemo(FILES);

    await store.getState().setSettings({ pace_base_s_per_km: 420 });

    expect(client.analyze).toHaveBeenLastCalledWith(
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      { ...DEFAULT_SETTINGS, pace_base_s_per_km: 420 },
    );
  });

  it("reports a file it could not fetch", async () => {
    serve(["/demo/activity.fit"]);
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadDemo(FILES);

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("activity.fit: HTTP 404");
    expect(store.getState().phase).toBeNull();
    expect(client.analyze).not.toHaveBeenCalled();
  });

  it("reports worker errors", async () => {
    const client = fakeClient();
    client.summarizePlan.mockRejectedValue(new Error("ElevationMissing"));
    const store = createStore(() => client);

    await store.getState().loadDemo(FILES);

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("ElevationMissing");
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
