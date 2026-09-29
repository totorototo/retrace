import { create } from "zustand";

import { createWorkerClient } from "../worker/client.js";

// The plan's pace settings (gpxz defaults). They must match the ones the plan was made with.
export const DEFAULT_SETTINGS = {
  pace_base_s_per_km: 500,
  fatigue_coefficient: 0.002,
  life_base_stop_s: 3600,
};

const MAX_FILE_BYTES = 256 * 1024 * 1024;

export const createStore = (getClient = createWorkerClient) => {
  let client = null;
  const worker = () => (client ??= getClient());
  // Only the latest refresh may write its results: a slow earlier one must not win.
  let generation = 0;

  return create((set, get) => ({
    gpx: null, // { name, bytes: ArrayBuffer }
    fit: null,
    settings: DEFAULT_SETTINGS,
    plan: null,
    activity: null,
    report: null,
    status: "idle", // idle | working | done | error
    error: null,

    async loadFile(kind, file) {
      if (file.size > MAX_FILE_BYTES) {
        set({ status: "error", error: `${file.name} is too large` });
        return;
      }
      const bytes = await file.arrayBuffer();
      set({ [kind]: { name: file.name, bytes }, report: null, error: null });
      await get().refresh();
    },

    async setSettings(partial) {
      set({ settings: { ...get().settings, ...partial } });
      await get().refresh();
    },

    // Recomputes whatever the loaded files allow: the plan, the activity, and the report
    // once both are there.
    async refresh() {
      const { gpx, fit, settings } = get();
      if (!gpx && !fit) return;
      const current = ++generation;
      set({ status: "working", error: null });
      try {
        const [plan, activity] = await Promise.all([
          gpx ? worker().summarizePlan(gpx.bytes, settings) : null,
          fit ? worker().summarizeActivity(fit.bytes) : null,
        ]);
        const report = gpx && fit ? await worker().analyze(gpx.bytes, fit.bytes, settings) : null;
        if (current !== generation) return;
        set({ plan, activity, report, status: "done" });
      } catch (err) {
        if (current !== generation) return;
        set({ status: "error", error: err.message });
      }
    },

    reset() {
      generation++;
      set({
        gpx: null,
        fit: null,
        plan: null,
        activity: null,
        report: null,
        status: "idle",
        error: null,
      });
    },
  }));
};

const useStore = createStore();
export default useStore;
