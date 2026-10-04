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
  // New files or a reset drop whatever is still computing: bumped there, checked before
  // each write.
  let generation = 0;
  // The refresh computing, if any, and whether another was asked for meanwhile.
  let running = null;
  let rerun = false;
  // The settings the results on screen were computed with: a failed pass falls back to them.
  let applied = null;

  return create((set, get) => {
    // One pass of refresh(): what the loaded files allow, written unless a newer pass or a
    // reset has made it stale.
    async function compute() {
      const { gpx, fit, settings, activity } = get();
      if (!gpx && !fit) return;
      const current = generation;
      const stale = () => current !== generation || rerun;
      set({ status: "working", phase: gpx && fit ? "analysing" : "parsing", error: null });
      try {
        let result;
        if (gpx && fit) {
          // The plan's summary isn't rerun once both files are in: dropped, not left stale.
          result = { report: await worker().analyze(settings), plan: null };
        } else if (gpx) {
          result = { plan: await worker().summarizePlan(settings), report: null };
        } else {
          result = { activity: activity ?? (await worker().summarizeActivity()), report: null };
        }
        if (stale()) return;
        applied = settings;
        set({ ...result, status: "done", phase: null, ...NO_REPLAY });
      } catch (err) {
        if (stale()) return;
        // why: back to the settings the story on screen was made with, so the pickers never
        // claim settings whose numbers aren't the ones shown. The error still says what failed.
        set({
          status: "error",
          phase: null,
          error: err.message,
          ...(applied && applied !== settings && { settings: applied }),
        });
      }
    }

    return {
      // The files loaded, by name: their bytes live in the worker (loadFiles).
      gpx: null, // { name }
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
        let gpx, fit;
        try {
          [gpx, fit] = await Promise.all(
            [files.gpx, files.fit].map(async ({ name, url }) => {
              const response = await fetch(url);
              if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
              // A host that answers every path with the app (an SPA fallback) sends a page,
              // not the file: say so, rather than let the parser fail on HTML.
              if (response.headers?.get("content-type")?.includes("text/html")) {
                throw new Error(`${name}: not found`);
              }
              return { name, bytes: await response.arrayBuffer() };
            }),
          );
        } catch (err) {
          set({ status: "error", phase: null, error: err.message });
          return;
        }
        await get().loadFiles({ gpx, fit });
      },

      /**
       * Hands the worker a plan, an activity or both ({ name, bytes: ArrayBuffer }, the bytes
       * transferred), then recomputes. One at a time is the app's flow, plan then activity;
       * the demo gives both at once.
       */
      async loadFiles({ gpx, fit }) {
        // Whatever is computing is on the files these replace.
        generation++;
        set({ status: "working", phase: "reading", error: null, report: null, ...NO_REPLAY });
        try {
          await Promise.all([
            gpx && worker().loadPlan(gpx.bytes),
            fit && worker().loadActivity(fit.bytes),
          ]);
        } catch (err) {
          set({ status: "error", phase: null, error: err.message });
          return;
        }
        set({
          ...(gpx && { gpx: { name: gpx.name }, plan: null }),
          // The activity's summary doesn't depend on the settings: computed once per file.
          ...(fit && { fit: { name: fit.name }, activity: null }),
        });
        await get().refresh();
      },

      async setSettings(partial) {
        set({ settings: { ...get().settings, ...partial } });
        await get().refresh();
      },

      /**
       * Recomputes what the screen shows: the report once both files are in, else the summary
       * of the one there is. A refresh asked for while one computes runs once it's done, on
       * the latest settings, however many were asked for.
       * why: the worker can't drop a request it has started (a WASM call runs to the end), so
       * queueing one per click would run every analysis in turn; and its result would be
       * stale, so it isn't written either.
       */
      refresh() {
        if (running) {
          rerun = true;
          return running;
        }
        running = (async () => {
          try {
            do {
              rerun = false;
              await compute();
            } while (rerun);
          } finally {
            // In the same tick as the loop's last check: a refresh asked for after it starts
            // a new run, never joins one that has ended.
            running = null;
          }
        })();
        return running;
      },

      reset() {
        generation++;
        applied = null;
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
    };
  });
};

const useStore = createStore();
export default useStore;
