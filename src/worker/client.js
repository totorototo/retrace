// Promise wrapper around the analysis worker: one pending request per id.

export function createAnalysisClient(worker) {
  let nextId = 0;
  const pending = new Map();

  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.error) request.reject(new Error(data.error));
    else request.resolve(data.result);
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || "Analysis worker failed");
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  /**
   * Sends a request. ArrayBuffers in `payload` are copied before transfer, so the caller
   * keeps its own bytes (the store reuses them when the plan settings change).
   */
  function request(type, payload = {}) {
    const id = nextId++;
    const copied = {};
    const transfer = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value instanceof ArrayBuffer) {
        copied[key] = value.slice(0);
        transfer.push(copied[key]);
      } else {
        copied[key] = value;
      }
    }
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload: copied }, transfer);
    });
  }

  return {
    summarizePlan: (gpx, settings) => request("summarizePlan", { gpx, settings }),
    summarizeActivity: (fit) => request("summarizeActivity", { fit }),
    analyze: (gpx, fit, settings) => request("analyze", { gpx, fit, settings }),
    terminate: () => worker.terminate(),
  };
}

export function createWorkerClient() {
  const worker = new Worker(new URL("./analysis.worker.js", import.meta.url), {
    type: "module",
  });
  return createAnalysisClient(worker);
}
