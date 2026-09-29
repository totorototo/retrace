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

  it("passes bytes and settings to Zig and parses the JSON it returns", async () => {
    summarizePlan.mockResolvedValue(slice({ distance_m: 6000 }));
    const gpx = new Uint8Array([1, 2, 3]).buffer;

    const response = await handleMessage({
      id: 7,
      type: "summarizePlan",
      payload: { gpx, settings: { pace_base_s_per_km: 450 } },
    });

    expect(response).toEqual({ id: 7, result: { distance_m: 6000 } });
    const [bytes, settings] = summarizePlan.mock.calls[0];
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect([...bytes]).toEqual([1, 2, 3]);
    expect(settings).toEqual({ pace_base_s_per_km: 450 });
  });

  it("turns a Zig error into an error response", async () => {
    analyze.mockRejectedValue(new Error("ActivityNotOnRoute"));

    const response = await handleMessage({
      id: 1,
      type: "analyze",
      payload: { gpx: new ArrayBuffer(1), fit: new ArrayBuffer(1) },
    });

    expect(response).toEqual({ id: 1, error: "ActivityNotOnRoute" });
  });

  it("rejects unknown requests", async () => {
    expect(await handleMessage({ id: 2, type: "nope" })).toEqual({
      id: 2,
      error: "Unknown request: nope",
    });
  });
});
