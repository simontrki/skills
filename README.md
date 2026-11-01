# Skills

Agent skills for Claude Code / Claude (folders with a `SKILL.md`).

| Skill | What it does |
|---|---|
| [`parametric-print-generator`](parametric-print-generator/) | Builds a single-file HTML app (three.js + manifold-3d) that generates a parametric 3D-printable model with live preview and STL/3MF export – quick setup, two colours, JSON config, DE/EN switch, geometry recipes (honeycomb, hollow profiles, countersunk holes, dovetails, pin connectors) and a headless test script. |

## Install

Copy a skill folder into your skills directory:

```bash
git clone https://github.com/simontrki/skills
cp -r skills/parametric-print-generator ~/.claude/skills/
```

Project-only: copy it to `<project>/.claude/skills/` instead. On claude.ai, zip the folder and upload it under
Settings → Capabilities → Skills.

## parametric-print-generator

```
parametric-print-generator/
├── SKILL.md                      workflow, stack, UI conventions, pitfalls
├── assets/template.html          working starter app (honeycomb plate with rim + countersunk holes)
├── references/geometry-recipes.md  copy-ready manifold-3d snippets
├── references/ui-patterns.md     quick setup, toolbar, config, file names, colours, i18n
└── scripts/test_app.cjs          Playwright smoke test (CDN served from local node_modules)
```

Derived from the [French Cleat Module / Keilleisten-Modul](https://github.com/simontrki/1PageHtmlApps) generator,
but independent of that geometry.

---

**Deutsch:** Skills für Claude Code / Claude. `parametric-print-generator` erzeugt einseitige HTML-Apps
(three.js + manifold-3d) für parametrische 3D-Druck-Teile mit Live-Vorschau, STL/3MF-Export, Quick-Setup,
zwei Farben, Konfiguration als JSON und DE/EN-Umschaltung. Installation: Ordner nach `~/.claude/skills/` kopieren.
