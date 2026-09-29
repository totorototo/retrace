# retrace

Trail race analysis in the browser: the **plan** (a GPX route with typed checkpoints) against
what was **actually run** (a FIT activity). Everything runs locally, as an installable PWA; files
never leave the device.

The analysis is Zig, compiled to WebAssembly with [Zigar](https://github.com/chung-leong/zigar)
and run in a web worker. It is not vendored: `zig/build.zig.zon` pins three libraries.

| Library                                            | Role                                                       |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [gpxz](https://github.com/totorototo/gpxz)         | GPX parsing, the plan (pace model, sections, ETAs)         |
| [fitz](https://github.com/totorototo/fitz)         | FIT parsing                                                |
| [debriefz](https://github.com/totorototo/debriefz) | Plan vs actual: checkpoints, sections, climbs, calibration |

Requires **Zig 0.16.0** and Node 22+ (npm 11).

## Scripts

```sh
npm install
npm run dev          # Vite dev server (first start compiles the WASM module: ~1 min)
npm run build        # production build + service worker
npm run test:zig     # Zig tests (zig/, against the fixtures)
npm run test:run     # Vitest (WASM mocked)
npm run e2e          # Playwright: build, preview, real WASM round trip
npm run fixtures     # regenerate zig/testdata (synthetic race)
```

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
  store/             zustand: files, settings, results
  components/        FilePicker, SettingsForm, Summary
  theme/             Terminus design system (Theme.js copied from Terminus)
  sw.js              Workbox precache → works offline
e2e/                 Playwright specs
```

## Data flow

1. `FilePicker` reads the file with `File.arrayBuffer()`.
2. The store sends the bytes to the worker (copied and transferred, so the store keeps its
   own bytes and can rerun when the settings change).
3. The worker passes a `Uint8Array` to the Zig export. Zig parses and compares, then returns
   **JSON**, so there are no Zigar proxies over WASM memory to free on the JS side.
4. The worker posts the parsed object back and the store updates.

## Updating a Zig dependency

```sh
cd zig
zig fetch --save=debriefz git+https://github.com/totorototo/debriefz#<commit>
```

Keep gpxz and fitz on the commits debriefz pins, so they share one set of types.
