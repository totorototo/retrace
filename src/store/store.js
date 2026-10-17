import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

import { createWorkerClient } from "../worker/client.js";

// The plan's pace settings (gpxz defaults). They must match the ones the plan was made with.
export const DEFAULT_SETTINGS = {
  pace_base_s_per_km: 500,
  fatigue_coefficient: 0.002,
  life_base_stop_s: 3600,
};

// A replay belongs to the report it was started on.
const NO_REPLAY = { replay_s: null, replayPlaying: false };

const MAX_FILE_BYTES = 256 * 1024 * 1024;
const STORAGE_KEY = "retrace-storage";

// The system's variant, until the toggle picks one (then persisted), as Terminus starts from.
function systemTheme() {
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

// localStorage for persist, writing only what changed and never throwing.
// why: persist writes on every set(), the replay's per-frame ones included, and lets a
// storage error escape the action that set it; blocked storage (private mode, a sandbox)
// must cost the reload's memory, not the action.
function guardedStorage() {
  let written = null;
  return createJSONStorage(() => ({
    getItem(name) {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem(name, value) {
      if (value === written) return;
      try {
        localStorage.setItem(name, value);
        written = value;
      } catch {
        // Not remembered across reloads, but still set.
      }
    },
    removeItem(name) {
      try {
        localStorage.removeItem(name);
      } catch {
        // Nothing to forget.
      }
    },
  }));
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

  const state = (set, get) => {
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
      theme: systemTheme(), // dark | light

      toggleTheme() {
        set({ theme: get().theme === "dark" ? "light" : "dark" });
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

      // A file picked in Setup: read here, its bytes handed to the worker. Nothing is uploaded.
      async loadFile(kind, file) {
        if (file.size > MAX_FILE_BYTES) {
          set({ status: "error", phase: null, error: `${file.name} is too large` });
          return;
        }
        const bytes = await file.arrayBuffer();
        await get().loadFiles({ [kind]: { name: file.name, bytes } });
      },

      /**
       * Hands the worker a plan, an activity or both ({ name, bytes: ArrayBuffer }, the bytes
       * transferred), then recomputes. One at a time is the app's flow, plan then activity.
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
  };

  return create(
    devtools(
      persist(state, {
        name: STORAGE_KEY,
        storage: guardedStorage(),
        // why: only the user's choices survive a reload. The files' bytes live in the worker,
        // so a persisted report or file name would point at nothing.
        partialize: ({ theme, settings }) => ({ theme, settings }),
        // Settings saved before a new one was added keep its default.
        merge: (saved, current) => ({
          ...current,
          ...saved,
          settings: { ...current.settings, ...saved?.settings },
        }),
      }),
      { name: "retrace", enabled: import.meta.env.DEV },
    ),
  );
};

const useStore = createStore();
export default useStore;
