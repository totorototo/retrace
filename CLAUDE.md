# retrace: project rules

Web app (PWA) comparing a trail race plan (GPX) with the race that was run (FIT).
React 19 + styled-components + zustand, Vite 8, Vitest, Playwright, Zig 0.17 via Zigar.

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
- Files are picked in Setup (GPX, then FIT), read in JS and posted as ArrayBuffers. Nothing is
  uploaded or stored remotely. The one network use is the map: Mapbox tiles for the race area, with `VITE_MAPBOX_KEY` from
  a local `.env` (never committed; see `.env.example`). Offline, it falls back to an SVG.
- Design system (Trail Suite): tokens come from `@totorototo/trail-tokens` (shared with Terminus
  and Waymark); `src/theme/Theme.js` only re-exports it. To change a token, change it in the
  Trail Suite design-system artifact first, then in the package, then bump the tag here. Never
  edit values in this repo. The theme holds the colour tokens plus the map inks (`map`, fixed
  across themes: the basemap stays light; Mapbox and the map's markers read them as JS values).
  Use the CSS custom properties. Component styles go in `*.style.js` next to the component.
- Light and dark, as in Terminus: the system's variant until the toggle picks one. Colour
  that means behind or ahead of the plan uses `--color-behind(-text)` / `--color-ahead(-text)`,
  never the raw tokens: light's secondary is orange, not green. Text steps down through
  `--color-text-muted` / `--color-text-faint`, never a hand-set mix of `--color-text`.

## Data

- Never commit personal recordings. `.gitignore` blocks `*.fit`/`*.gpx` except the synthetic
  fixtures in `zig/testdata/` (regenerate with `npm run fixtures`).
