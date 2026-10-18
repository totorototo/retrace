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

  it("transfers a plan.json, and sends nothing to remove it", async () => {
    const worker = fakeWorker(({ id }) => ({ id, result: null }));
    const client = createAnalysisClient(worker);
    const plan = new Uint8Array([123, 125]).buffer;

    await client.loadPlanFile(plan);
    expect(worker.lastMessage).toMatchObject({ type: "loadPlanFile", payload: { plan } });
    expect(worker.lastTransfer).toEqual([plan]);

    await client.loadPlanFile(null);
    expect(worker.lastMessage.payload).toEqual({ plan: null });
    expect(worker.lastTransfer).toEqual([]);
  });

  it("sends nothing once the files are loaded", async () => {
    const worker = fakeWorker(({ id, payload }) => ({ id, result: payload }));
    const client = createAnalysisClient(worker);

    await expect(client.analyze()).resolves.toEqual({});
    expect(worker.lastMessage.type).toBe("analyze");
    expect(worker.lastTransfer).toEqual([]);
  });

  it("rejects with the worker's error", async () => {
    const client = createAnalysisClient(fakeWorker(({ id }) => ({ id, error: "TimeInvalid" })));
    await expect(client.summarizeActivity()).rejects.toThrow("TimeInvalid");
  });
});
