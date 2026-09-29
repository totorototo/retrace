// Analysis web worker: owns the Zig/WASM module and keeps parsing off the main thread.
//
// Protocol: the page posts { id, type, payload } and gets back { id, result } or
// { id, error }. Payload bytes arrive as transferred ArrayBuffers; the Zig side returns
// JSON (see zig/retrace.zig for why), which is parsed here so the page receives plain objects.

import { __zigar, analyze, summarizeActivity, summarizePlan } from "../../zig/retrace.zig";

let ready = null;

function init() {
  ready ??= __zigar.init();
  return ready;
}

// A []u8 comes back from Zigar as a slice object; `.string` decodes it as UTF-8.
const decode = (slice) => JSON.parse(slice.string);

const bytesOf = (buffer) => new Uint8Array(buffer);

export const handlers = {
  async summarizePlan({ gpx, settings }) {
    return decode(await summarizePlan(bytesOf(gpx), settings ?? {}));
  },
  async summarizeActivity({ fit }) {
    return decode(await summarizeActivity(bytesOf(fit)));
  },
  async analyze({ gpx, fit, settings }) {
    return decode(await analyze(bytesOf(gpx), bytesOf(fit), settings ?? {}));
  },
};

export async function handleMessage({ id, type, payload }) {
  const handler = handlers[type];
  if (!handler) return { id, error: `Unknown request: ${type}` };
  try {
    await init();
    return { id, result: await handler(payload) };
  } catch (err) {
    // Zig errors surface as JS errors named after the error set member (e.g. TimeInvalid).
    return { id, error: err?.message ?? String(err) };
  }
}

self.onmessage = async (event) => {
  self.postMessage(await handleMessage(event.data));
};
