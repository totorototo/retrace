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

  function request(type, payload = {}, transfer = []) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload }, transfer);
    });
  }

  // The loads transfer the caller's buffer, which is detached (empty) afterwards: the
  // worker keeps the bytes, and the other requests use them.
  return {
    loadPlan: (gpx) => request("loadPlan", { gpx }, [gpx]),
    loadActivity: (fit) => request("loadActivity", { fit }, [fit]),
    summarizePlan: (settings) => request("summarizePlan", { settings }),
    summarizeActivity: () => request("summarizeActivity"),
    analyze: (settings) => request("analyze", { settings }),
    terminate: () => worker.terminate(),
  };
}

export function createWorkerClient() {
  const worker = new Worker(new URL("./analysis.worker.js", import.meta.url), {
    type: "module",
  });
  return createAnalysisClient(worker);
}
