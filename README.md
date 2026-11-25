# Icon Canvas

A pure-line icon set (24 grid, 1.5 stroke, round caps and joins, no fills) where an icon is not just a drawing but a small state machine, driven by CSS. 259 icons, about 150 more names that are the same icons in a state (`mic-off`, `arrow-left`, `cloud-done`, `user-plus`), one fixed 14 KB stylesheet, no per-icon CSS.

## Getting started

Needs Node 22.18 or newer and pnpm 12.

```bash
pnpm install
pnpm dev      # http://localhost:5173  (Library, Studio, Showcase, Quality)
```

A pnpm workspace in TypeScript (strict), formatted and linted with Biome. Rules for the icons: [SPEC.md](SPEC.md). Working notes for agents: [AGENTS.md](AGENTS.md).

| Command                                  | Does                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev`                               | the app, with the dev-server endpoint that saves icons to `packages/icons/svg/`                      |
| `pnpm build` / `pnpm preview`            | production build of the app into `apps/studio/dist/`, and a server for it                            |
| `pnpm seed` / `pnpm seed:check`          | write every icon file from its recipe and the pose table / verify only                               |
| `pnpm css`                               | regenerate `poses.css` (only when the number of pose channels or beats changes)                      |
| `pnpm export`                            | every name as a static SVG, a sprite and a manifest in `export/` (generated, not committed)          |
| `pnpm typecheck`                         | `tsc` in every package                                                                               |
| `pnpm lint` / `pnpm format`              | Biome: check / check and write the fixes                                                             |
| `pnpm quick <names>` / `--all` | checks recipes from their numbers in under a second, no browser: bounds, centring, grid, narrow gaps, loose ends (`pnpm seed` runs it on every file it writes) |
| `pnpm geom "<expression>"` | Paper.js in Node: rotate, scale, union or subtract shapes and print paste-ready path data |
| `pnpm verify-icons <names> [--sheet] [--motion]` | checks icons in a headless Chrome in about 5 s and draws them (large, 16/24/48 px, motion frames) to `.cache/icons/` |
| `pnpm check`                             | lint, typecheck and `seed:check`: what to run before a commit                                        |

## Layout

```
packages/
  icons/     the icon files (svg/), the source of truth, and the list of them as a module
  core/      the rules and the drawing: spec tokens, geometry, parametric recipes, the pose table. No DOM
  runtime/   what a consumer loads: <icon-glyph>, <icon-morph> and the stylesheets (css/)
  checks/    everything that judges an icon: rule lint, raster measurement, Paper.js shape analysis, audits
  engine/    the headless model behind the app, and window.iconCanvas for devtools and agents
apps/
  studio/    the React app: Library, Studio, Showcase and Quality pages
tools/       scripts that write files: seed the icon files, generate poses.css, export static SVGs
```

Each package depends only on the ones above it in this list (`core` on nothing, `runtime` on `core` and `icons`, `checks` on those, `engine` on all four). Packages are consumed as source: there is no build step between them, and Node runs the TypeScript in `tools/` directly.

## Using the icons

The packages are not published yet; inside this workspace, depend on `@icon-canvas/runtime` and load the runtime and the stylesheets, then use `<icon-glyph>`:

```js
import '@icon-canvas/runtime/register' // defines <icon-glyph> and <icon-morph>
import '@icon-canvas/runtime/css/icons.css' // --icon-* variables, off and state transitions
import '@icon-canvas/runtime/css/poses.css' // the one stylesheet that turns each icon's data into motion
import '@icon-canvas/runtime/css/swap.css' // optional: one icon turning into another (fade and turn)
import '@icon-canvas/runtime/css/morph.css' // optional: one icon turning into another, shape to shape
```

```html
<icon-glyph name="bell"></icon-glyph>
<icon-glyph name="mic" state="off"></icon-glyph>       <!-- or name="mic-off" -->
<icon-glyph name="arrow-left"></icon-glyph>             <!-- the arrow, turned -->
```

An icon is decorative by default (`aria-hidden="true"`); put the name and state on the button that holds it. Give it an `aria-label` and it becomes a labelled image.

Inside a shadow root, the rules that match the icon's own elements have to be adopted by that root as well (tested with `poses.css`: `mic` in state 1 draws its slash inside a shadow root). Keep loading the stylesheet in the document too, since `@property` registers numbers only there:

```js
import poses from '@icon-canvas/runtime/css/poses.css?inline'
const sheet = new CSSStyleSheet()
sheet.replaceSync(poses)
shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sheet]
```

### Look, in CSS variables

```css
:root {
  --icon-stroke: 1.5; /* line weight */
  --icon-cap: round; /* butt | round | square */
  --icon-join: round; /* miter | round | bevel */
  --icon-radius: 1; /* corner radius multiplier, 0 sharp .. 2.5 soft */
  --icon-curve: 0; /* 0 circles .. 1 squircles */
  --icon-color: currentColor;
  --icon-size: 24px;
}
```

### Motion and state, in CSS numbers

Set these on the icon or any ancestor (a hover rule, a transition, an animation, a scroll timeline):

| Variable                                   | Meaning                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--icon-motion` (0 to 1)                   | a momentary gesture: a bell rings, an arrow lunges                                                                                               |
| `--icon-state` (0, 1, 2, ...)              | the state the icon is in: 0 normal, 1 and up are named (a microphone: 1 off; Wi-Fi: 1 weak, 2 off; a cloud: 1 upload, 2 download, 3 done, 4 off) |
| `--icon-look-x`, `--icon-look-y` (-1 to 1) | eyes only                                                                                                                                        |

```css
button:hover {
  --icon-motion: 1;
  transition: --icon-motion 900ms linear;
}
button[aria-pressed='true'] {
  --icon-state: 1;
  transition: --icon-state 400ms linear;
}
```

The numbers are registered CSS properties, so anything that can drive a CSS number can drive an icon, including a scroll timeline:

```css
@keyframes ring {
  to {
    --icon-motion: 1;
  }
}
.bell {
  animation: ring linear both;
  animation-timeline: scroll();
} /* no JavaScript */
```

and the eyes take two numbers from whatever you like (the Showcase sets them from the pointer):

```js
eye.style.setProperty('--icon-look-x', x) // -1 .. 1
```

A state persists, so moving the number is the transition (any value in between is a valid frame). It can bring elements in (the bell's unread dot, the bulb's rays), turn or mirror the whole icon (the arrow, skip), and redraw parts (play to pause). `iconCanvas.aliases` lists every name that means an icon in a state; `iconCanvas.poses[name].states` lists a given icon's states. The states of an icon sit on one axis, so a jump from 0 to 4 passes through 1, 2 and 3: a cloud going from normal to `off` plays upload, download and done on the way. Icons whose states are neighbours in real use (plus and minus, then check and x) are ordered that way; for a control that jumps between unrelated stops, step through 0 or use a short transition. Under `prefers-reduced-motion` the supplied CSS turns transitions off; do the same in your own.

### Depth (opt in)

A lit, glossy look and a cast shadow for a few large icons. Load `depth.css` and ask for it on the icon; nothing changes otherwise.

```css
@import '@icon-canvas/runtime/css/depth.css';
```

```html
<icon-glyph name="bell" depth="tube shadow" style="--icon-size: 96px"></icon-glyph>
```

`depth="tube"` lights the strokes as glossy tubes (an SVG lighting filter, tuned for about 48 to 160 px), `depth="shadow"` casts a shadow. `--icon-lift` (0 to 1) floats the icon: the shadow moves away and softens, and a transition on that number is the animation. `--icon-light` (degrees) turns the shadow. Chromium shows all of it; elsewhere the icon is flat. Use it on dozens of icons, not hundreds: see the cost note at the top of `depth.css`.

### One icon turning into another

For two icons that really differ (a sun and a moon, a menu and a cross). Any two icons in the set work, with nothing drawn for the pair:

```html
<icon-morph from="sun" to="moon" state="to"></icon-morph>
```

Like everything else it is one number, `--icon-morph` (0 shows the first icon, 1 the second), set by `state="to"` or by any CSS on the element or an ancestor (`:hover { --icon-morph: 1 }`); changing it is a CSS transition (`--icon-morph-duration`, `--icon-morph-easing`). It is a switch with a transition, not a scrubber, so it does not follow a scroll timeline. Every stroke of the first icon moves into a stroke of the second; a stroke with nothing to become shrinks and fades. How: CSS can animate a path's `d` only between two paths with the same commands, so `packages/runtime/src/morph/` pairs the strokes of the two icons (nearest first), rewrites each pair with the same number of cubic curves, picks the start point and direction that line up best, and stores both ends of each stroke as CSS variables, so a plain transition on `d` does the moving (no stylesheet rules are made per pair). Planning a pair takes about a millisecond and is cached. `iconCanvas.morphPlan(a, b)` returns the plan, including `rough: true` when the two have little in common (most of the ink fades instead of moving); `data-fit="rough"` is set on the element, and the plain swap suits such a pair better. Needs CSS `d` (Chrome, Edge, Firefox); elsewhere the icon changes instantly.

### Without CSS (an `<img>`, a mask, copy and paste)

```js
import { renderIcon } from '@icon-canvas/runtime'
renderIcon('mic-off', { stroke: 1.5 }, { inline: true }) // a plain static SVG with the state baked in
```

`renderIcon` does not touch the DOM; a Node script imports it from `@icon-canvas/runtime/render`. For consumers that cannot use CSS (an `<img>`, a mask, a design tool), `pnpm export` writes every name as a plain static SVG to `export/svg/` (states baked in, so `mic-off.svg` has its slash) with a `sprite.svg` (one `<symbol>` per name: `<use href="sprite.svg#mic-off">`) and a `manifest.json` of name → base icon and state.

### Weight

Measured with a production build of the runtime entry (every icon, every recipe, the state table, `<icon-glyph>`): about 283 KB minified, 48 KB gzipped for 235 icons, which is roughly 0.2 KB gzipped per icon. `<icon-morph>` adds about 12 KB (4 KB gzipped). The styles are 14.6 KB for `poses.css` (2.9 KB gzipped), 2.9 KB for `icons.css` (1.3 KB gzipped) and 2.3 KB for `morph.css` (1 KB gzipped), and they do not grow with the icon count. Per-icon motion is a handful of `data-` attributes in the SVG (about 350 bytes on average).

## Browser support

Motion and state need typed `attr()`, in Chrome and Edge 133+ (Safari has it in Technology Preview). Elsewhere the icons are shown still, in their normal look. Strict Content Security Policies are fine: no inline style attributes are used.

## Checks

Run in the page (`/quality`) or from the console:

```js
await iconCanvas.verify(iconCanvas.getSVG()) // one drawing
await iconCanvas.poseLint() // data, rest identical, alive, smooth states, bounds, pivots
await iconCanvas.perfAudit() // style cost, recipe drawing cost, weight, against budgets
iconCanvas.a11yAudit() // glyphs hidden or labelled, named controls, 24 px targets, reduced motion
iconCanvas.morphAudit() // every icon morphed into the next: same commands at both ends, on the canvas, cheap
await iconCanvas.audit() // the whole set, including performance
```

After editing the pose table (`packages/core/src/poses/table.ts`): `pnpm seed` (writes the icon files; `pnpm seed:check` only verifies), then run the lints. If the number of channels or beats changes: `pnpm css`.

## License

[MIT](LICENSE)
