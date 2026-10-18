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

  it("keeps a loaded file, and passes it to Zig", async () => {
    summarizePlan.mockResolvedValue(slice({ distance_m: 6000 }));
    const gpx = new Uint8Array([1, 2, 3]).buffer;

    expect(await handleMessage({ id: 6, type: "loadPlan", payload: { gpx } })).toEqual({
      id: 6,
      result: null,
    });
    const response = await handleMessage({
      id: 7,
      type: "summarizePlan",
      payload: {},
    });

    expect(response).toEqual({ id: 7, result: { distance_m: 6000 } });
    const [bytes, planFile] = summarizePlan.mock.calls[0];
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect([...bytes]).toEqual([1, 2, 3]);
    // No plan.json yet: an empty one, and the route's stats only.
    expect(planFile).toHaveLength(0);
  });

  it("asks for a file it hasn't been given", async () => {
    expect(await handleMessage({ id: 3, type: "summarizeActivity" })).toEqual({
      id: 3,
      error: "No FIT loaded",
    });
  });

  it("passes a loaded plan.json to Zig, until it is removed", async () => {
    summarizePlan.mockResolvedValue(slice({}));
    analyze.mockResolvedValue(slice({}));
    await handleMessage({ id: 1, type: "loadPlan", payload: { gpx: new ArrayBuffer(2) } });
    await handleMessage({ id: 2, type: "loadActivity", payload: { fit: new ArrayBuffer(3) } });
    const plan = new Uint8Array([123, 125]).buffer;
    await handleMessage({ id: 3, type: "loadPlanFile", payload: { plan } });

    await handleMessage({ id: 4, type: "summarizePlan" });
    await handleMessage({ id: 5, type: "analyze" });
    expect([...summarizePlan.mock.calls[0][1]]).toEqual([123, 125]);
    expect([...analyze.mock.calls[0][2]]).toEqual([123, 125]);

    await handleMessage({ id: 6, type: "loadPlanFile", payload: { plan: null } });
    await handleMessage({ id: 7, type: "summarizePlan" });
    expect(summarizePlan.mock.calls[1][1]).toHaveLength(0);
    // And no comparison without it.
    expect(await handleMessage({ id: 8, type: "analyze" })).toEqual({
      id: 8,
      error: "No plan.json loaded",
    });
  });

  it("turns a Zig error into an error response", async () => {
    analyze.mockRejectedValue(new Error("ActivityNotOnRoute"));
    await handleMessage({ id: 1, type: "loadPlan", payload: { gpx: new ArrayBuffer(1) } });
    await handleMessage({ id: 2, type: "loadActivity", payload: { fit: new ArrayBuffer(1) } });
    await handleMessage({ id: 3, type: "loadPlanFile", payload: { plan: new ArrayBuffer(1) } });

    const response = await handleMessage({ id: 4, type: "analyze" });

    expect(response).toEqual({ id: 4, error: "ActivityNotOnRoute" });
  });

  it("rejects unknown requests", async () => {
    expect(await handleMessage({ id: 2, type: "nope" })).toEqual({
      id: 2,
      error: "Unknown request: nope",
    });
  });
});
