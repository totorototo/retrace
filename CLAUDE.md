# retrace: project rules

Web app (PWA) comparing a trail race plan (GPX) with the race that was run (FIT).
React 19 + styled-components + zustand, Vite 8, Vitest, Playwright, Zig 0.16 via Zigar.

## Zig side (`zig/`)

- Don't vendor library code. gpxz, fitz and debriefz are dependencies pinned in
  `build.zig.zon`. Fix bugs upstream and bump the pin.
- `retrace.zig` is a thin boundary: bytes in, JSON out. Exports are camelCase (they are the JS
  API); internal functions are snake_case and take a scratch and an output allocator, so the
  tests can use `std.testing.allocator` for both.
- Zigar builds the WASM module with its own build.zig, using `build.extra.zig` for imports
  (`ignoreBuildFile: true` in vite.config.js). `zig/build.zig` is only for `zig build test`.
- Report field names come from debriefz/gpxz and are the JSON keys the UI reads.

## JS side

- Only the worker imports `.zig` files. Unit tests mock them (`vi.mock`); vitest.config.js
  stubs `.zig` loads so Vitest never compiles Zig. The real WASM path is covered by e2e.
- No file pickers: the app is a demo of one race. `src/demo.js` names the GRP 2026 files in
  `public/demo/`; `main.jsx` fetches them at startup and the store posts them to the worker as
  ArrayBuffers. e2e routes those URLs to the synthetic fixtures. The other network use is the map: Mapbox tiles for the race area, with `VITE_MAPBOX_KEY` from
  a local `.env` (never committed; see `.env.example`). Offline, it falls back to an SVG.
- Design system: `src/theme/Theme.js` (from Terminus). Use the CSS custom properties.
  Component styles go in `*.style.js` next to the component.
- Light and dark, as in Terminus: the system's variant until the toggle picks one. Colour
  that means behind or ahead of the plan uses `--color-behind(-text)` / `--color-ahead(-text)`
  from `GlobalStyle.js`, never the raw tokens: light's secondary is orange, not green.

## Data

- Never commit personal recordings. `.gitignore` blocks `*.fit`/`*.gpx` except the synthetic
  fixtures in `zig/testdata/` (regenerate with `npm run fixtures`) and the demo race in
  `public/demo/` (the author's GRP 2026, already public on Strava and Garmin Connect, passed
  through `npm run scrub-fit` so it holds the race and not the runner's profile).
