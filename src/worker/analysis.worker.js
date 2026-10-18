// Analysis web worker: owns the Zig/WASM module and keeps parsing off the main thread.
//
// Protocol: the page posts { id, type, payload } and gets back { id, result } or
// { id, error }. Each file arrives once, transferred (loadPlan, loadActivity, loadPlanFile),
// and stays here: the requests after it send nothing. The Zig side returns JSON (see
// zig/retrace.zig for why), which is parsed here so the page receives plain objects.

import { __zigar, analyze, summarizeActivity, summarizePlan } from "../../zig/retrace.zig";

let ready = null;

function init() {
  ready ??= __zigar.init();
  return ready;
}

// A []u8 comes back from Zigar as a slice object; `.string` decodes it as UTF-8.
const decode = (slice) => JSON.parse(slice.string);

// The files loaded, as bytes.
// why: kept here, not posted with every request: the page would copy them each time (the
// FIT runs to 11 MB), and a settings change only needs the settings to cross.
// planFile is the route's plan.json: the model the race is compared with.
const files = { gpx: null, fit: null, planFile: null };
const NO_PLAN_FILE = new Uint8Array(0);

const FILE_NAMES = { gpx: "GPX", fit: "FIT", planFile: "plan.json" };

function loaded(kind) {
  if (!files[kind]) throw new Error(`No ${FILE_NAMES[kind]} loaded`);
  return files[kind];
}

export const handlers = {
  loadPlan({ gpx }) {
    files.gpx = new Uint8Array(gpx);
    return null;
  },
  loadActivity({ fit }) {
    files.fit = new Uint8Array(fit);
    return null;
  },
  // The plan.json, or null to forget it (a new race, before its own is in).
  loadPlanFile({ plan }) {
    files.planFile = plan ? new Uint8Array(plan) : null;
    return null;
  },
  async summarizePlan() {
    return decode(await summarizePlan(loaded("gpx"), files.planFile ?? NO_PLAN_FILE));
  },
  async summarizeActivity() {
    return decode(await summarizeActivity(loaded("fit")));
  },
  async analyze() {
    return decode(await analyze(loaded("gpx"), loaded("fit"), loaded("planFile")));
  },
};

export async function handleMessage({ id, type, payload }) {
  const handler = handlers[type];
  if (!handler) return { id, error: `Unknown request: ${type}` };
  try {
    await init();
    return { id, result: await handler(payload ?? {}) };
  } catch (err) {
    // Zig errors surface as JS errors named after the error set member (e.g. TimeInvalid).
    return { id, error: err?.message ?? String(err) };
  }
}

self.onmessage = async (event) => {
  self.postMessage(await handleMessage(event.data));
};
