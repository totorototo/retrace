// vi.mock is hoisted above the imports: the worker never loads the real WASM module here.
vi.mock("../../zig/retrace.zig", () => ({
  __zigar: { init: vi.fn().mockResolvedValue(undefined) },
  summarizePlan: vi.fn(),
  summarizeActivity: vi.fn(),
  analyze: vi.fn(),
}));

import { analyze, summarizePlan } from "../../zig/retrace.zig";
import { handleMessage } from "./analysis.worker.js";

const slice = (value) => ({ string: JSON.stringify(value) });

describe("analysis worker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps a loaded file, and passes it with the settings to Zig", async () => {
    summarizePlan.mockResolvedValue(slice({ distance_m: 6000 }));
    const gpx = new Uint8Array([1, 2, 3]).buffer;

    expect(await handleMessage({ id: 6, type: "loadPlan", payload: { gpx } })).toEqual({
      id: 6,
      result: null,
    });
    const response = await handleMessage({
      id: 7,
      type: "summarizePlan",
      payload: { settings: { pace_base_s_per_km: 450 } },
    });

    expect(response).toEqual({ id: 7, result: { distance_m: 6000 } });
    const [bytes, settings] = summarizePlan.mock.calls[0];
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect([...bytes]).toEqual([1, 2, 3]);
    expect(settings).toEqual({ pace_base_s_per_km: 450 });
  });

  it("asks for a file it hasn't been given", async () => {
    expect(await handleMessage({ id: 3, type: "summarizeActivity" })).toEqual({
      id: 3,
      error: "No FIT loaded",
    });
  });

  it("turns a Zig error into an error response", async () => {
    analyze.mockRejectedValue(new Error("ActivityNotOnRoute"));
    await handleMessage({ id: 1, type: "loadPlan", payload: { gpx: new ArrayBuffer(1) } });
    await handleMessage({ id: 2, type: "loadActivity", payload: { fit: new ArrayBuffer(1) } });

    const response = await handleMessage({ id: 4, type: "analyze", payload: { settings: {} } });

    expect(response).toEqual({ id: 4, error: "ActivityNotOnRoute" });
  });

  it("rejects unknown requests", async () => {
    expect(await handleMessage({ id: 2, type: "nope" })).toEqual({
      id: 2,
      error: "Unknown request: nope",
    });
  });
});
