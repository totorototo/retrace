# retrace

<p align="left">

<a href="src/"><img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Story%20UI-purple" alt="Frontend React"></a>
<a href="zig/"><img src="https://img.shields.io/badge/Analysis-Zig%200.16.0%20%E2%86%92%20WASM-blue" alt="Zig WASM"></a>
<a href="https://retrace-alpha.netlify.app"><img src="https://img.shields.io/badge/Live%20Demo-retrace--alpha.netlify.app-brightgreen" alt="Live Demo"></a>

</p>

**[→ Live Demo](https://retrace-alpha.netlify.app)**

Trail race analysis in the browser: the **plan** (a GPX route with typed checkpoints) against
what was **actually run** (a FIT activity), shown on one race: the author's Grand Raid des
Pyrénées 2026 Ultra Tour. The analysis runs locally, as an installable PWA that works offline.

## The story

One scroll-driven page, in order:

| Section     | What it shows                                                                  |
| ----------- | ------------------------------------------------------------------------------ |
| Overview    | The race in short: finish time against the plan, and the takeaways             |
| Gap         | Behind or ahead of the plan, kilometre by kilometre                            |
| Terrain     | The elevation profile, with where the run left the planned trace               |
| Climbs      | Each climb and descent: planned against actual time                            |
| Map         | The route on Mapbox, with a replay of the runner against the plan's runner     |
| Time lost   | Where the time went, as a waterfall per stretch (moving pace and stops)        |
| Pace        | Moving pace against the plan, per section or stage, bars as wide as the course |
| Heart rate  | Heart rate set against the pace                                                |
| Checkpoints | Arrival at each checkpoint against the plan and the cutoff                     |
| Next time   | The pace model refitted on the race: the plan that would have fitted           |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React UI (main thread)                   │
│  Story sections · zustand store · d3 scales · Mapbox GL      │
└──────────────────────────────┬───────────────────────────────┘
                               │ postMessage: ArrayBuffers in, plain objects out
                               ▼
┌──────────────────────────────────────────────────────────────┐
│             Web Worker (src/worker/analysis.worker.js)       │
│  The only importer of .zig: owns the WASM instance           │
└──────────────────────────────┬───────────────────────────────┘
                               │ Zigar: Uint8Array in, JSON string out
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                 Zig → WebAssembly (zig/retrace.zig)          │
│  summarizePlan · summarizeActivity · analyze                 │
│  on top of gpxz (plan) · fitz (FIT) · debriefz (comparison)  │
└──────────────────────────────────────────────────────────────┘
```

Zig returns JSON rather than Zigar structs, so no proxies over WASM memory reach React state
and nothing on the JS side has to free them. `retrace.zig` stays a thin boundary; the
analysis lives in three libraries, pinned in `zig/build.zig.zon` rather than vendored:

| Library                                            | Role                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [gpxz](https://github.com/totorototo/gpxz)         | GPX parsing, the plan (pace model, sections, ETAs)         |
| [fitz](https://github.com/totorototo/fitz)         | FIT parsing                                                |
| [debriefz](https://github.com/totorototo/debriefz) | Plan vs actual: checkpoints, sections, climbs, calibration |

### Data flow

1. At startup, `main.jsx` fetches the demo race (`public/demo/`) as ArrayBuffers.
2. The store sends the bytes to the worker (copied and transferred, so the store keeps its
   own bytes and can rerun when the settings change).
3. The worker passes a `Uint8Array` to the Zig export, which parses, compares and returns JSON.
4. The worker posts the parsed object back and the store updates.

## Getting started

Requires **Zig 0.16.0** on `PATH` and Node 22+ (npm 11).

```sh
npm install
cp .env.example .env   # then set VITE_MAPBOX_KEY (a Mapbox public token)
npm run dev            # first start compiles the WASM module: ~1 min
```

Without a Mapbox key (or offline) the map falls back to an SVG of the route; everything
else works as is.

## Scripts

```sh
npm run dev            # Vite dev server
npm run build          # production build + service worker
npm run lint           # ESLint
npm run test:zig       # Zig tests (zig/, against the fixtures)
npm run test:run       # Vitest (WASM mocked)
npm run test:all       # both
npm run e2e            # Playwright: build, preview, real WASM round trip
npm run fixtures       # regenerate zig/testdata (synthetic race)
npm run scrub-fit      # strip the runner's profile from a FIT file: in.fit out.fit
npm run icons          # regenerate the PWA icons
```

Pushes to `main` build in GitHub Actions (Netlify has no Zig), run the tests and e2e, deploy
`dist/` to Netlify, then run Lighthouse on the live site.

## Layout

```
zig/
  build.zig.zon      pinned deps: gpxz, fitz, debriefz
  build.extra.zig    Zigar hook: hands those modules to the WASM build
  build.zig          native build for `zig build test` (Zigar ignores it)
  retrace.zig        the JS API: summarizePlan, summarizeActivity, analyze → JSON
  testdata/          synthetic route.gpx + activity.fit (scripts/make-fixtures.mjs)
src/
  worker/            analysis.worker.js (owns WASM) + client.js (promise RPC)
  store/             zustand: files, settings, results, replay
  components/
    story/           Story.jsx + sections/ (one component per section above)
    map/             RaceMap (Mapbox), Replay, offline SVG fallback
    setup/, settingsForm/, summary/, …
  demo.js            the demo race's files, served from public/demo/
  theme/             Terminus design system (Theme.js copied from Terminus)
  sw.js              Workbox precache → works offline
e2e/                 Playwright specs (demo URLs routed to the synthetic fixtures)
```

## The demo data

`public/demo/` holds the author's GRP 2026 (160 km): the planned GPX and the recorded FIT,
both already public on Strava and Garmin Connect. The FIT went through `npm run scrub-fit`,
which keeps the race messages (session, laps, records, events) and drops the rest, so it holds
the race and not the runner's profile. No other recordings are committed: `.gitignore` blocks
`*.fit` and `*.gpx` outside `public/demo/` and `zig/testdata/`.

## Updating a Zig dependency

```sh
cd zig
zig fetch --save=debriefz git+https://github.com/totorototo/debriefz#<commit>
```

Keep gpxz and fitz on the commits debriefz pins, so they share one set of types.
