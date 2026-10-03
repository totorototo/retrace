import { create } from "zustand";

import { DEMO_FILES } from "../demo.js";
import { createWorkerClient } from "../worker/client.js";

// The plan's pace settings (gpxz defaults). They must match the ones the plan was made with.
export const DEFAULT_SETTINGS = {
  pace_base_s_per_km: 500,
  fatigue_coefficient: 0.002,
  life_base_stop_s: 3600,
};

// A replay belongs to the report it was started on.
const NO_REPLAY = { replay_s: null, replayPlaying: false };

const THEME_KEY = "retrace-theme";

// The variant the user last picked, else the system's, as Terminus starts from.
// why: localStorage, not zustand's persist middleware: one string is all that survives a
// reload here, and the store's other state (files, report) must not.
function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Storage blocked (private mode, a sandbox): fall back to the system.
  }
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

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
    // What the work is at while status is "working", for the loader's label.
    phase: null, // reading | parsing | analysing
    error: null,
    // Where the pointer is along the route, shared by every chart and the map; null when
    // it's on none of them.
    cursor_m: null,
    // The race replayed on the map, in race seconds: null when it isn't being replayed.
    // why: in the store, not the map's state: it changes every frame, and only the leaves
    // that select it (the runners' markers, the controls) re-render, not the whole map.
    replay_s: null,
    replayPlaying: false,
    theme: initialTheme(), // dark | light

    toggleTheme() {
      const theme = get().theme === "dark" ? "light" : "dark";
      set({ theme });
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Not remembered across reloads, but still switched.
      }
    },

    setCursor(cursor_m) {
      if (cursor_m !== get().cursor_m) set({ cursor_m });
    },

    setReplay(replay_s, replayPlaying = get().replayPlaying) {
      set({ replay_s, replayPlaying });
    },

    stopReplay() {
      set({ replay_s: null, replayPlaying: false });
    },

    // Fetches the demo race's two files, then analyses them.
    async loadDemo(files = DEMO_FILES) {
      set({ status: "working", phase: "reading", error: null });
      try {
        const [gpx, fit] = await Promise.all(
          [files.gpx, files.fit].map(async ({ name, url }) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
            return { name, bytes: await response.arrayBuffer() };
          }),
        );
        set({ gpx, fit, report: null, ...NO_REPLAY });
      } catch (err) {
        set({ status: "error", phase: null, error: err.message });
        return;
      }
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
      set({ status: "working", phase: "parsing", error: null });
      try {
        const [plan, activity] = await Promise.all([
          gpx ? worker().summarizePlan(gpx.bytes, settings) : null,
          fit ? worker().summarizeActivity(fit.bytes) : null,
        ]);
        let report = null;
        if (gpx && fit) {
          if (current === generation) set({ phase: "analysing" });
          report = await worker().analyze(gpx.bytes, fit.bytes, settings);
        }
        if (current !== generation) return;
        set({ plan, activity, report, status: "done", phase: null, ...NO_REPLAY });
      } catch (err) {
        if (current !== generation) return;
        set({ status: "error", phase: null, error: err.message });
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
        phase: null,
        error: null,
        cursor_m: null,
        ...NO_REPLAY,
      });
    },
  }));
};

const useStore = createStore();
export default useStore;
