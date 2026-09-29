import { createStore, DEFAULT_SETTINGS } from "./store.js";

// jsdom's File has no arrayBuffer(); the store only needs these three members.
const file = (name, bytes = [1, 2, 3]) => ({
  name,
  size: bytes.length,
  arrayBuffer: async () => new Uint8Array(bytes).buffer,
});

function fakeClient() {
  return {
    summarizePlan: vi.fn().mockResolvedValue({ distance_m: 6000 }),
    summarizeActivity: vi.fn().mockResolvedValue({ samples: 10 }),
    analyze: vi.fn().mockResolvedValue({ checkpoints: [] }),
  };
}

describe("store", () => {
  it("summarizes a plan alone, then analyses once the activity arrives", async () => {
    const client = fakeClient();
    const store = createStore(() => client);

    await store.getState().loadFile("gpx", file("route.gpx"));
    expect(store.getState().plan).toEqual({ distance_m: 6000 });
    expect(store.getState().report).toBeNull();
    expect(client.analyze).not.toHaveBeenCalled();

    await store.getState().loadFile("fit", file("activity.fit"));
    expect(store.getState().report).toEqual({ checkpoints: [] });
    expect(store.getState().status).toBe("done");
    expect(client.analyze).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      DEFAULT_SETTINGS,
    );
  });

  it("reruns the analysis with new settings", async () => {
    const client = fakeClient();
    const store = createStore(() => client);
    await store.getState().loadFile("gpx", file("route.gpx"));
    await store.getState().loadFile("fit", file("activity.fit"));

    await store.getState().setSettings({ pace_base_s_per_km: 420 });

    expect(client.analyze).toHaveBeenLastCalledWith(
      expect.any(ArrayBuffer),
      expect.any(ArrayBuffer),
      { ...DEFAULT_SETTINGS, pace_base_s_per_km: 420 },
    );
  });

  it("reports worker errors", async () => {
    const client = fakeClient();
    client.summarizePlan.mockRejectedValue(new Error("ElevationMissing"));
    const store = createStore(() => client);

    await store.getState().loadFile("gpx", file("route.gpx"));

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
