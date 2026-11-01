# UI patterns (all implemented in `assets/template.html`)

## Sidebar order

1. Title + one-line subtitle.
2. `.exportgrid`: `Neu berechnen`, `3MF` (primary), `Modell STL`, `Teil A STL`, `Teil B STL`, optional
   `Stifte STL`. Each button: `<b>Title</b><small>what is inside</small>`.
3. `#stats` (key figures: count, dimensions, holes, volume, weight, weight per colour, triangles, compute time)
   and `#warn` (red, one warning per line).
4. `.quick` – quick setup grid.
5. `<details>` sections (closed): part-specific groups, then *Farben (2-farbig)*, *Ausgabe*.

## Quick setup ↔ detail fields

```html
<label>Wabe Ø (mm)<input type="number" data-target="cell" data-also="fillCell" step="0.5"></label>
<label class="wide">Farben<span style="display:flex;gap:6px">
  <select data-target="palette" style="flex:1"></select>
  <button type="button" class="swap swapBtn" title="Farben tauschen (A ↔ B)">⇅</button></span></label>
```

Quick inputs have **no id** (so they are not saved twice); on change they write into `data-target` (+ every
id in `data-also`) and dispatch `change`. `syncQuick()` copies values back after every detail change and
fills quick selects once from the target's `innerHTML` (before the first translation!).

## Parameters

- Every numeric label carries its unit: `(mm)`, `(°)`, `(Stk.)` / `(pcs)`, `(g/cm³)`.
- Hints as `<small>` inside the label (e.g. `0 = automatisch`).
- `NUM` array lists numeric ids for `readParams()`; selects/checkboxes are read explicitly.
- Changing an input → debounced `regenerate()` (150 ms). Exceptions without rebuild: density, name, colours.

## Toolbar (top right of the viewport)

Icon buttons (`.ico`, inline SVG, `title` tooltip): open config · save config · defaults | X-ray (toggle) ·
neighbours (toggle) · reset view | language (`EN` / `DE` text). Toggles get `.on` (accent background).
Feedback via `toast(msg)` below the toolbar (2.6 s). No other floating panels.

## Configuration

- `getConfig()` = `{ app, version, saved, values: { id: value | checked } }` over all `aside input[id], aside select[id]`.
- Save → `download(JSON, exportName('_konfig', 'json'))`; open → hidden `<input type=file>`; defaults → captured
  `DEFAULTS` at startup.
- Remember after every change and every build: `localStorage.setItem(APP_KEY + '-config', …)` in try/catch;
  restore on start with a toast.

## File names

`exportName(suffix, ext)` → `name_suffix_YYYY-MM-DD_HH-MM-SS.ext`, name sanitised (`[\s/\\:*?"<>|]+ → _`),
live preview under the name field (updated every second).

## Two colours

- Colour A / B pickers, presets (`PALETTES` with `name`, `a`, `b`, `note`), `custom` when edited by hand.
- Swap button(s) `.swapBtn` exchange A and B.
- Split select: `part` (separate bodies, AMS / multi-material) or `height` (Z split at a named height, note
  tells the M600 / pause height).
- 3MF: `basematerials` with `displaycolor`, two mesh objects, one component object, one build item.

## Language (DE default, EN switch)

- `EN` dictionary keyed by the exact (trimmed) German DOM text; also tooltips (`title`), palette names/notes,
  stats labels.
- `translateDOM()` walks text nodes (skipping `script/style/svg` and the dynamic containers `#stats #warn
  #paletteNote #splitNote #toast #busy #fnamePreview`) and stores the German original in a `WeakMap`.
- Dynamic texts use `L(de, en)` (warnings, notes, toasts) or `tr(key)` (stats labels).
- `setLang()` stores the choice, re-translates, refreshes notes and calls `regenerate()`.
- Test: switch to EN, open all `<details>`, look for remaining umlauts (`scripts/test_app.cjs` does this).

## Theme and layout

CSS tokens on `:root` with dark-mode overrides (`prefers-color-scheme` and `[data-theme]`), sidebar 330 px,
viewport fills the rest; below 760 px the viewport stacks on top (55 vh). Scene background follows the theme.
