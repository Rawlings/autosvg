# AGENTS.md

Guidance for AI agents working in this project. Humans: [README.md](README.md) says how to use the set, [SPEC.md](SPEC.md) describes the icon rules.

## What this is

A Vite app (`icon-canvas`) for designing a **pure line icon set**: 24px grid, 1.5px stroke, round caps and joins, no fills, no backgrounds. A React app with four pages: **Library** (`/`, the set, search, brand settings), **Studio** (`/studio/<icon>`, the 24×24 canvas with keylines, checks, sizes, neighbours, SVG source), **Motion** (`/motion`, pose test bench) and **Quality** (`/quality`, the whole-set checks). The app exposes `window.iconCanvas` (a headless engine, `src/engine.js`) so an agent can draw, measure and compare.

```bash
npm run dev                      # or preview_start "icon-canvas"; http://localhost:5173
node scripts/seed-poses.mjs      # regenerate the icon files from recipes + the pose table (--check to verify only)
node scripts/gen-poses-css.mjs   # regenerate src/poses.css (only if the number of pose channels or beats changes)
```

| Path | Role |
| --- | --- |
| `src/icons/*.svg` | **The icons. Source of truth.** Edited in the canvas; Save writes the file. |
| `scripts/build-icons.mjs` | Original kit that seeded the first 85 icons. Superseded by `seed-poses.mjs`; leave it alone. |
| `scripts/seed-poses.mjs` | Writes every icon file: recipe (or the file's own geometry) + pose data from the table. Checks each pose's expected shape count. |
| `src/pose-table.js` | **The pose table**: every icon's choreography, written with the vocabulary in `src/pose-dsl.js`. |
| `src/poses.js` | Writes the table into SVG as `data-` attributes (and splits multi-stroke paths when a pose asks for it). |
| `src/poses.css` | The one fixed, generated stylesheet that turns pose data into motion (typed `attr()`; Chrome/Edge 133+). |
| `src/swap.css`, `src/components/SwapIcon.jsx` | Icon swap: one icon turning into another, driven by `--icon-swap`. Only for icons that really differ; states of one icon use `--icon-state`. |
| `src/pages/Showcase.jsx`, `src/styles/showcase.css` | Icons in real components, driven by CSS only. Add a component here when a new capability needs proving. If two icons differ by a stroke or one change (mic and mic-off, lock and unlock), make it one icon with a state (`withStates` in the pose table) instead of swapping or shipping two files. |
| `src/pose-lint.js` | Pose lint (`iconCanvas.poseLint()`): structure, XML, rest, alive, bounds, pivots, thin main gesture. The test bench is the Motion page. |
| `src/a11y-audit.js` | Accessibility audit (`iconCanvas.a11yAudit(root?)`): icons hidden or labelled, named controls, 24 px targets, reduced motion. Run it on any new component. |
| `src/perf-audit.js` | Performance audit (`iconCanvas.perfAudit()`, included in `audit()`): style cost of posing, recipe drawing cost, pose weight, against budgets. |
| `src/engine.js` | Headless model and the whole `window.iconCanvas` API. The canvas drawing is a detached `<g>`; React renders it and subscribes to changes. |
| `src/main.jsx`, `src/app/`, `src/pages/`, `src/components/`, `src/styles/` | The React UI (router, pages, canvas, tokens). Pure presentation: it calls the engine, never the other way round. |
| `vite.config.js` | Dev-server endpoint behind `iconCanvas.save()`. Agent-only: the page has no Save button (the user doesn't want one). |
| `src/geo.js` | Geometry helpers (fillets, circle chains, mirroring, arcs). |
| `src/paper-tools.js` | Paper.js tools: booleans, simplify, centre, shape analysis. |
| `src/recipes.js` | Parametric recipes (corner radius, curve) for every icon with corners or circles (the Quality page counts them). Must match their saved files at defaults. |
| `src/coverage.js` | Coverage lint: finds icons with rounded corners or circles that ignore radius/curve. `iconCanvas.coverage().missing` must be empty. |
| `scripts/export-svgs.mjs` | `npm run export`: every name (icons and states) as a static SVG in `export/svg/`, plus `sprite.svg` and `manifest.json`. |
| `src/morph.js`, `src/morph.css`, `src/components/MorphIcon.jsx` | `<icon-morph>`: any icon into any other, shape to shape, driven by `--icon-morph`. `iconCanvas.morphPlan(a, b)` and `morphAudit()`. Use it only for icons that really differ; states of one icon use `--icon-state`. |
| `src/icon-runtime.js` | `<icon-glyph>` + `renderIcon`: draws icons from CSS custom properties (`--icon-*`). |
| `src/icons.css` | The CSS-variable contract (`--icon-*`). |
| `src/measure.js` | Raster measurement: narrow gaps, extent, ink. |
| `src/lint.js`, `src/spec.js` | Rule checks and tokens. |
| `.claude/skills/icon-craft/` | **The workflow skill. Use it for any icon task.** |
| `.claude/skills/icon-craft/references/lessons.md` | What has worked and failed. Read first. |

## How to work

For any task about icons, the set, or the icon tooling, **use the `icon-craft` skill** and follow it. In short: read the lessons, draw with helpers, `verify`, `compare`, **look**, fix, repeat. Done means `verify` is `ok` **and** you looked at the 16/24/48px render and it is good.

## Rules that always apply

- **Work in the Studio page** (its inspector also shows the icon in each of its states) (`/studio/<icon>`, the one with the grid and keylines): load the icon, draw with `setSVG`/`append`/`patch` using `geo` and `pp`, look at the canvas, then `await iconCanvas.save()`. The app has no Save button and no brand dropdown on purpose; don't add UI the user has to guess the purpose of. UI direction (user-set): spacious, less is more, no generic AI look; one neutral palette, status colour only where something needs attention. Don't create side views, full-screen overlays or contact sheets that cover it, and don't change icons by regenerating files from a script. The user is watching that page.
- Never run `node scripts/build-icons.mjs --force`; it discards canvas edits.
- **Every icon has a pose, and it lives in the SVG** (see SPEC.md "Poses"). A new icon needs a recipe (if it has corners or circles) and an entry in `src/pose-table.js` with the right shape count and, where the object has them, its states (`withStates`): an icon is one icon with states, never two files like `mic` and `mic-off`, `arrow-left` and `arrow-up`, `play` and `pause` (a state can bring new elements in, turn or mirror the whole icon with a group, or redraw parts), then `node scripts/seed-poses.mjs`, then `iconCanvas.poseLint()` and `iconCanvas.perfAudit()` must pass (and `a11yAudit()` for any UI that uses icons) (`audit()` runs the performance audit too). Motion and state must make sense: a state is a real persistent condition of the object, a motion a real verb (when in doubt, leave it out). A lid hinges, a clapper lags, strokes draw in the order a hand would), stay inside the canvas at every value up to 1.25, and look right in the Motion page's frames. Never write a pivot by guessing a shape's position: check the shape order first.
- **This is a library used by many consumers. Ship parameters, not behaviours.** The library exposes numbers as CSS variables (`--icon-radius`, `--icon-pose`, `--icon-glint`, easing and duration tokens); the consumer decides when they change (hover, selected, loading, scroll, pointer, its own script). Don't build triggers, pointer tracking or choreography into the library. Anything motion-related must work by a consumer setting a variable on any ancestor, and must respect `prefers-reduced-motion`.
- Pure line only. Don't add fills, tints, dots as shapes, backgrounds, or extra UI chrome unless the user asks.
- Don't guess a visual direction. If it is not settled, show 3 small samples first.
- Install dependencies with a bare `npm install <pkg>` (no redirects or pipes) after vetting with `guardPackage`.
- Don't claim a tool or fix works until you ran it. Report what you saw, including flaws, and what you did not test.

## Self-correction protocol

This project gets better through a feedback loop. You are responsible for running it.

**Auto-correct a piece of work (inside a task)**
1. Run `await iconCanvas.verify(iconCanvas.getSVG())` on what is in the canvas. Apply every hint. Re-run. Repeat until `ok`.
2. Screenshot the Studio page and look: full size, the 16 to 48px previews, and the icon in the "Beside its neighbours" strip. If it looks wrong, fix it in the canvas and go back to step 1.
3. Maximum 4 rounds per icon. Then stop, state what is wrong and what you tried, and ask. Never ship a shape you dislike, and never loop silently.
4. After a batch, run `await iconCanvas.audit()` and handle every flagged icon or say why it is deliberate.

**Learn (after a task, or immediately on a trigger)**

Triggers: the user corrects you or expresses dissatisfaction; a check you trusted was wrong (false positive or false negative); a tool behaved unexpectedly; an approach clearly worked or clearly failed.

1. Write a lesson in `.claude/skills/icon-craft/references/lessons.md` using its format. Include the evidence: a measurement, a screenshot description, or the user's words. No evidence, no lesson.
2. **Promote** a lesson into `SKILL.md` as a permanent rule when it has recurred, or it is general and high-impact. Mark it `promoted`.
3. **Retire or fix** lessons that prove wrong or outdated. Never keep two contradicting rules. Merge duplicates.
4. If a check or tool is the thing that was wrong, fix the tool (`src/lint.js`, `src/measure.js`, `src/paper-tools.js`) and note it in the lesson. Calibrate checks against known-good and known-bad icons, as `verify` was calibrated.
5. User preferences (style, scope, UI) are rules, not suggestions. Record them as such and follow them over your own judgment.

**Keep the loop healthy**
- Keep `lessons.md` short: merge, don't pile up. If it grows past about 40 entries, consolidate.
- Never edit this file's rules on a hunch. Change AGENTS.md or SKILL.md only for a lesson you can point to evidence for.
- In your final message, say which lessons you read and applied, and which you added or changed.
