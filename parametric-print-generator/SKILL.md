---
name: parametric-print-generator
description: Build a single-file HTML app (three.js + manifold-3d) that generates a parametric, 3D-printable model with live 3D preview and STL/3MF export – e.g. wall modules, French cleats, honeycomb plates, holders, boxes, brackets, organisers. Use when the user asks for an HTML/Three.js generator for a printable part, a "parametrisches Modell", "STL-Generator", "Konfigurator für 3D-Druck", "HTML mit threejs und STL export", or wants to turn a part idea into an adjustable tool. Covers CSG geometry recipes (honeycomb infill, hollow open-top shells, countersunk screw holes, dovetails, triangular pin connectors, tolerances), two-colour export, quick setup, JSON config, DE/EN switch and headless testing.
---

# Parametric print generator (single-file HTML)

Build one self-contained `.html` file that turns parameters into a watertight, printable mesh and
exports it. The proven stack and UI come from a finished project (French cleat wall module); the
geometry is always project-specific.

## Stack (fixed – do not substitute)

- **three.js 0.160.0** via importmap from `cdn.jsdelivr.net` (+ `OrbitControls`).
- **manifold-3d 3.0.0** (`https://cdn.jsdelivr.net/npm/manifold-3d@3.0.0/manifold.js`, WASM) for all solid
  modelling. It guarantees manifold output → slicers accept the STL/3MF without repair. Do **not** use
  three-bvh-csg or hand-built meshes for booleans.
- No build step, no framework. Everything inline in one file. Internet is needed at load time (CDN) – say so.

## Workflow

1. **Clarify the part** – only what changes the geometry. Typical: overall size, heights, wall/web thickness,
   repeat pitch, mounting (screw holes, countersink), how parts join (connectors), print orientation, colours.
   If a request is ambiguous but has a sensible default, pick it, state the assumption, make it a parameter.
   *Everything should be adjustable* ("alles einstellbar") – every number becomes an input.
2. **Start from `assets/template.html`.** It already contains: layout, export buttons + stats at the top,
   quick setup, collapsible detail sections, toolbar (open/save/defaults, X-ray, neighbours, reset view,
   DE/EN), two-colour split, STL/3MF writers, JSON config + localStorage, toasts, dark mode.
   Copy it, rename `APP_KEY`, title, `EN` dictionary entries, then replace `build(p)` and the parameter HTML.
3. **Write `build(p)`** with the recipes in `references/geometry-recipes.md`. Contract:
   `build(p) → { manifold, colA, colB, info, warnings }`. Z up, model centred in XY, z = 0 = print bed / wall side.
   Collect every intermediate in `trash` via `T(...)` and delete at the end (WASM memory).
4. **Wire parameters**: add each input to the detail sections (with unit in the label: `(mm)`, `(°)`, `(Stk.)`),
   to `NUM` in `readParams()`, the most important ones to the quick setup (`data-target`, `data-also` for
   linked fields), and every new visible German string to `EN`.
5. **Warnings, not crashes**: check impossible combinations (wall too thick for the profile, hole wider than
   the foot, countersink deeper than the part) and push a bilingual `L(de, en)` warning.
6. **Test headless** with `scripts/test_app.cjs` (see Testing). Look at the screenshots – also close-ups of
   joints/connectors via `window.viewer.camera` – before handing over.
7. **Deliver** the file, summarise defaults/assumptions in the user's language, mention the CDN requirement and
   suggest a small test print for tolerances. When publishing to a repo, add a license header comment
   (three.js MIT, manifold-3d Apache-2.0) and a README section (EN + DE).

## UI conventions (users asked for these explicitly – keep them)

- Export buttons and stats **at the very top** of the sidebar. Every button says what is inside
  (`3MF – 2-farbig, A + B`, `Modell STL – einfarbig, alles in einem`, `Teil A STL – nur Farbe A`, …).
- **Quick setup** box with the 8–14 most important values; detail sections collapsed by default.
- **Units on every numeric label.** Sensible defaults (e.g. honeycomb 10 mm, walls 1 mm, holes in all rows).
- **Toolbar top right of the viewport, icons only** (with tooltips): open config, save config, defaults |
  X-ray, neighbour parts (for modular systems), reset view | language button (`EN`/`DE`). No floating
  settings window.
- **Two colours**: presets that suit the mounting surface, a swap button (⇅) in quick setup and colour section,
  split *by part* (multi-material/AMS) or *by height* (single nozzle, M600 at a Z height).
- **File names** `name_suffix_YYYY-MM-DD_HH-MM-SS.ext` with underscores; live preview below the name field.
- **Config**: save/load JSON, restore defaults, auto-remember in localStorage (wrapped in try/catch).
- **Language**: German default, everything translatable (labels, hints, options, tooltips, stats, warnings,
  palette notes, toasts). Switching re-runs `regenerate()` so warnings re-render.

Details and code: `references/ui-patterns.md`.

## Geometry rules of thumb

- Think in **2D cross-sections + extrusion** (`CrossSection` → `extrude`) and booleans; avoid per-vertex work.
- Use fill rule `'NonZero'` for all polygons (orientation-independent).
- Profiles along X: build the profile in (u, z), `extrude(L)`, then `.rotate([90, 0, 90])` → (L, u, z).
- Hollow "open top/bottom" parts: outer prism − inner prism where the inner profile is extended beyond
  z-range before offsetting (`offset(-wall, 'Miter')`), then add honeycomb ∩ inner.
- Keep the two colour bodies **non-overlapping**: `bodyA = bodyA − bodyB` before export.
- Connectors that join identical modules: male/female on opposite sides, or separate plug-in parts
  (exported as their own STL, laid flat). Clearance goes into the socket (`offset(+clearance)`), parts stay nominal.
- Separate print parts (pins, keys) get their own `Stifte STL` button and are shown assembled in the viewer.

See `references/geometry-recipes.md` for copy-ready functions (hex lattice, wedge/cleat profile, hollow shell,
countersunk boss, dovetail socket + key, triangular pin channel, flat bridge connector, colour split).

## Testing

```bash
npm i three@0.160.0 manifold-3d@3.0.0      # once, in a scratch dir
NODE_MODULES=$PWD/node_modules node scripts/test_app.cjs path/to/app.html out/
```

The script routes the jsdelivr URLs to the local `node_modules` (the sandbox proxy often blocks the CDN),
waits for the first build, prints stats/warnings/page errors, clicks every export button, toggles the
language and lists untranslated (umlaut) strings. Exit code 1 on page errors. For close-ups:
`page.evaluate(() => { viewer.camera.position.set(x, y, z); viewer.controls.target.set(...); viewer.controls.update(); })`
(three.js coordinates: x, y = up, z = −Y of the model).

## Pitfalls seen in practice

- `manifold.rotate([x, y, z])` applies X, then Y, then Z (degrees).
- `CrossSection.extrude(h, nDiv, twist, scaleTop)` scales around the 2D origin – centre the shape first
  (used for chamfered pin tips).
- `getMesh()` → `vertProperties` (stride `numProp`) and `triVerts`; three.js needs (x, z, −y).
- Every `translate/rotate/intersect/...` returns a new object; anything you return must not be in `trash`
  (return `m.translate([0,0,0])` copies).
- `CrossSection.bounds()` returns `{min:[x,y], max:[x,y]}`; `Manifold.boundingBox()` 3D.
- Quick-setup selects copy the detail select's `innerHTML` once – do that **before** the first translation.
- localStorage restore can keep old values after a default changes – tell the user to press "defaults".
- Large lattices: clip the hex polygons to the region bounds first; one `CrossSection` with all hexes,
  then `region.subtract(hexes)` – fast. Typical build 1–2 s for 240 × 240 mm.
