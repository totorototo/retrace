import { createAnalysisClient } from "./client.js";

function fakeWorker(respond) {
  const worker = {
    postMessage: vi.fn((message, transfer) => {
      worker.lastTransfer = transfer;
      queueMicrotask(() => worker.onmessage({ data: respond(message) }));
    }),
    terminate: vi.fn(),
  };
  return worker;
}

describe("analysis client", () => {
  it("resolves with the worker's result and keeps the caller's bytes", async () => {
    const worker = fakeWorker(({ id, payload }) => ({ id, result: payload.gpx.byteLength }));
    const client = createAnalysisClient(worker);
    const gpx = new Uint8Array([1, 2, 3, 4]).buffer;

    await expect(client.summarizePlan(gpx, {})).resolves.toBe(4);
    // A copy was transferred, not the original.
    expect(worker.lastTransfer).toHaveLength(1);
    expect(worker.lastTransfer[0]).not.toBe(gpx);
    expect(gpx.byteLength).toBe(4);
  });

  it("rejects with the worker's error", async () => {
    const client = createAnalysisClient(fakeWorker(({ id }) => ({ id, error: "TimeInvalid" })));
    await expect(client.summarizeActivity(new ArrayBuffer(1))).rejects.toThrow("TimeInvalid");
  });
});
