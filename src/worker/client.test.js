import { createAnalysisClient } from "./client.js";

function fakeWorker(respond) {
  const worker = {
    postMessage: vi.fn((message, transfer) => {
      worker.lastMessage = message;
      worker.lastTransfer = transfer;
      queueMicrotask(() => worker.onmessage({ data: respond(message) }));
    }),
    terminate: vi.fn(),
  };
  return worker;
}

describe("analysis client", () => {
  it("transfers a loaded file's bytes, without a copy", async () => {
    const worker = fakeWorker(({ id }) => ({ id, result: null }));
    const client = createAnalysisClient(worker);
    const gpx = new Uint8Array([1, 2, 3, 4]).buffer;

    await client.loadPlan(gpx);

    expect(worker.lastMessage).toMatchObject({ type: "loadPlan", payload: { gpx } });
    expect(worker.lastTransfer).toEqual([gpx]);
  });

  it("sends only the settings once the files are loaded", async () => {
    const worker = fakeWorker(({ id, payload }) => ({ id, result: payload.settings }));
    const client = createAnalysisClient(worker);

    await expect(client.analyze({ pace_base_s_per_km: 450 })).resolves.toEqual({
      pace_base_s_per_km: 450,
    });
    expect(worker.lastTransfer).toEqual([]);
  });

  it("rejects with the worker's error", async () => {
    const client = createAnalysisClient(fakeWorker(({ id }) => ({ id, error: "TimeInvalid" })));
    await expect(client.summarizeActivity()).rejects.toThrow("TimeInvalid");
  });
});
