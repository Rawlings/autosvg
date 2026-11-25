# Using and developing autosvg

The long version: how to load the runtime, drive motion and state from CSS, export plain SVGs, and work on the repo. The short version, with pictures, is in the [README](../README.md).

## Running it from source

Needs Node 22.18 or newer and pnpm 12.

```bash
pnpm install
pnpm dev      # http://localhost:5173  (Library, Studio, Showcase, Quality)
```

A pnpm workspace in TypeScript (strict), formatted and linted with Biome. Rules for the icons: [SPEC.md](../SPEC.md). Working notes for agents: [AGENTS.md](../AGENTS.md).

| Command                                  | Does                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev`                               | the app, with the dev-server endpoint that saves icons to `packages/vectors/svg/`                      |
| `pnpm build` / `pnpm preview`            | production build of the app into `apps/studio/dist/`, and a server for it                            |
| `pnpm seed` / `pnpm seed:check`          | write every icon file from its recipe and the pose table / verify only                               |
| `pnpm css`                               | regenerate `poses.css` (only when the number of pose channels or beats changes)                      |
| `pnpm export`                            | every name as a static SVG, a sprite and a manifest in `export/` (generated, not committed)          |
| `pnpm typecheck`                         | `tsc` in every package                                                                               |
| `pnpm lint` / `pnpm format`              | Biome: check / check and write the fixes                                                             |
| `pnpm quick <names>` / `--all` | checks recipes from their numbers in under a second, no browser: bounds, centring, grid, narrow gaps, loose ends (`pnpm seed` runs it on every file it writes) |
| `pnpm geom "<expression>"` | Paper.js in Node: rotate, scale, union or subtract shapes and print paste-ready path data |
| `pnpm verify-vectors <names> [--sheet] [--motion]` | checks icons in a headless Chrome in about 5 s and draws them (large, 16/24/48 px, motion frames) to `.cache/vectors/` |
| `pnpm hero` | redraws the README banner (`docs/hero.svg`) from the vectors in the set |
| `pnpm check`                             | lint, typecheck and `seed:check`: what to run before a commit                                        |

## Layout

```
packages/
  vectors/     the vector files (svg/), the source of truth, and the list of them as a module
  core/      the rules and the drawing: spec tokens, geometry, parametric recipes, the pose table. No DOM
  runtime/   what a consumer loads: <autosvg>, <autosvg-morph> and the stylesheets (css/)
  checks/    everything that judges a vector: rule lint, raster measurement, Paper.js shape analysis, audits
  engine/    the headless model behind the app, and window.autosvg for devtools and agents
apps/
  studio/    the React app: Library, Studio, Showcase and Quality pages
tools/       scripts that write files: seed the vector files, generate poses.css, export static SVGs
```

Each package depends only on the ones above it in this list (`core` on nothing, `runtime` on `core` and `vectors`, `checks` on those, `engine` on all four). Packages are consumed as source: there is no build step between them, and Node runs the TypeScript in `tools/` directly.

## Using the vectors in your own project

The packages are not published yet; inside this workspace, depend on `@autosvg/runtime` and load the runtime and the stylesheets, then use `<autosvg>`:

```js
import '@autosvg/runtime/register' // defines <autosvg> and <autosvg-morph>
import '@autosvg/runtime/css/icons.css' // --autosvg-* variables, off and state transitions
import '@autosvg/runtime/css/poses.css' // the one stylesheet that turns each vector's data into motion
import '@autosvg/runtime/css/swap.css' // optional: one vector turning into another (fade and turn)
import '@autosvg/runtime/css/morph.css' // optional: one vector turning into another, shape to shape
```

```html
<autosvg name="bell"></autosvg>
<autosvg name="mic" state="off"></autosvg>       <!-- or name="mic-off" -->
<autosvg name="arrow-left"></autosvg>             <!-- the arrow, turned -->
```

`<autosvg>` is a plain element, not a registered custom element: browsers only allow a hyphen in custom element names, so a bare name cannot be registered. A small observer draws each `<autosvg>` as it appears (a moment after, not synchronously). Inside a shadow root, call `watchAutosvg(shadowRoot)` once so it is watched too.

An icon is decorative by default (`aria-hidden="true"`); put the name and state on the button that holds it. Give it an `aria-label` and it becomes a labelled image.

Inside a shadow root, the rules that match the icon's own elements have to be adopted by that root as well (tested with `poses.css`: `mic` in state 1 draws its slash inside a shadow root). Keep loading the stylesheet in the document too, since `@property` registers numbers only there:

```js
import poses from '@autosvg/runtime/css/poses.css?inline'
const sheet = new CSSStyleSheet()
sheet.replaceSync(poses)
shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sheet]
```

### Look, in CSS variables

```css
:root {
  --autosvg-stroke: 0.75; /* line weight */
  --autosvg-cap: round; /* butt | round | square */
  --autosvg-join: round; /* miter | round | bevel */
  --autosvg-radius: 1; /* corner radius multiplier, 0 sharp .. 2.5 soft */
  --autosvg-curve: 0; /* 0 circles .. 1 squircles */
  --autosvg-color: currentColor;
  --autosvg-size: 24px;
}
```

### Motion and state, in CSS numbers

Set these on the icon or any ancestor (a hover rule, a transition, an animation, a scroll timeline):

| Variable                                   | Meaning                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--autosvg-motion` (0 to 1)                   | a momentary gesture: a bell rings, an arrow lunges                                                                                               |
| `--autosvg-state` (0, 1, 2, ...)              | the state the icon is in: 0 normal, 1 and up are named (a microphone: 1 off; Wi-Fi: 1 weak, 2 off; a cloud: 1 upload, 2 download, 3 done, 4 off) |
| `--autosvg-look-x`, `--autosvg-look-y` (-1 to 1) | eyes only                                                                                                                                        |

```css
button:hover {
  --autosvg-motion: 1;
  transition: --autosvg-motion 900ms linear;
}
button[aria-pressed='true'] {
  --autosvg-state: 1;
  transition: --autosvg-state 400ms linear;
}
```

The numbers are registered CSS properties, so anything that can drive a CSS number can drive an icon, including a scroll timeline:

```css
@keyframes ring {
  to {
    --autosvg-motion: 1;
  }
}
.bell {
  animation: ring linear both;
  animation-timeline: scroll();
} /* no JavaScript */
```

and the eyes take two numbers from whatever you like (the Showcase sets them from the pointer):

```js
eye.style.setProperty('--autosvg-look-x', x) // -1 .. 1
```

A state persists, so moving the number is the transition (any value in between is a valid frame). It can bring elements in (the bell's unread dot, the bulb's rays), turn or mirror the whole icon (the arrow, skip), and redraw parts (play to pause). `autosvg.aliases` lists every name that means an icon in a state; `autosvg.poses[name].states` lists a given icon's states. The states of an icon sit on one axis, so a jump from 0 to 4 passes through 1, 2 and 3: a cloud going from normal to `off` plays upload, download and done on the way. Icons whose states are neighbours in real use (plus and minus, then check and x) are ordered that way; for a control that jumps between unrelated stops, step through 0 or use a short transition. Under `prefers-reduced-motion` the supplied CSS turns transitions off; do the same in your own.

### Depth (opt in)

A lit, glossy look and a cast shadow for a few large icons. Load `depth.css` and ask for it on the icon; nothing changes otherwise.

```css
@import '@autosvg/runtime/css/depth.css';
```

```html
<autosvg name="bell" depth="tube shadow" style="--autosvg-size: 96px"></autosvg>
```

`depth="tube"` lights the strokes as glossy tubes (an SVG lighting filter, tuned for about 48 to 160 px), `depth="shadow"` casts a shadow. `--autosvg-lift` (0 to 1) floats the icon: the shadow moves away and softens, and a transition on that number is the animation. `--autosvg-light` (degrees) turns the shadow. Chromium shows all of it; elsewhere the icon is flat. Use it on dozens of icons, not hundreds: see the cost note at the top of `depth.css`.

### One icon turning into another

For two icons that really differ (a sun and a moon, a menu and a cross). Any two icons in the set work, with nothing drawn for the pair:

```html
<autosvg-morph from="sun" to="moon" state="to"></autosvg-morph>
```

Like everything else it is one number, `--autosvg-morph` (0 shows the first icon, 1 the second), set by `state="to"` or by any CSS on the element or an ancestor (`:hover { --autosvg-morph: 1 }`); changing it is a CSS transition (`--autosvg-morph-duration`, `--autosvg-morph-easing`). It is a switch with a transition, not a scrubber, so it does not follow a scroll timeline. Every stroke of the first icon moves into a stroke of the second; a stroke with nothing to become shrinks and fades. How: CSS can animate a path's `d` only between two paths with the same commands, so `packages/runtime/src/morph/` pairs the strokes of the two icons (nearest first), rewrites each pair with the same number of cubic curves, picks the start point and direction that line up best, and stores both ends of each stroke as CSS variables, so a plain transition on `d` does the moving (no stylesheet rules are made per pair). Planning a pair takes about a millisecond and is cached. `autosvg.morphPlan(a, b)` returns the plan, including `rough: true` when the two have little in common (most of the ink fades instead of moving); `data-fit="rough"` is set on the element, and the plain swap suits such a pair better. Needs CSS `d` (Chrome, Edge, Firefox); elsewhere the icon changes instantly.

### Without CSS (an `<img>`, a mask, copy and paste)

```js
import { renderIcon } from '@autosvg/runtime'
renderIcon('mic-off', { stroke: 0.75 }, { inline: true }) // a plain static SVG with the state baked in
```

`renderIcon` does not touch the DOM; a Node script imports it from `@autosvg/runtime/render`. For consumers that cannot use CSS (an `<img>`, a mask, a design tool), `pnpm export` writes every name as a plain static SVG to `export/svg/` (states baked in, so `mic-off.svg` has its slash) with a `sprite.svg` (one `<symbol>` per name: `<use href="sprite.svg#mic-off">`) and a `manifest.json` of name → base icon and state.

### Weight

Measured with a production build of the runtime entry (every icon, every recipe, the state table, `<autosvg>`): about 283 KB minified, 48 KB gzipped for 235 icons, which is roughly 0.2 KB gzipped per icon. `<autosvg-morph>` adds about 12 KB (4 KB gzipped). The styles are 14.6 KB for `poses.css` (2.9 KB gzipped), 2.9 KB for `icons.css` (1.3 KB gzipped) and 2.3 KB for `morph.css` (1 KB gzipped), and they do not grow with the icon count. Per-icon motion is a handful of `data-` attributes in the SVG (about 350 bytes on average).

## Browser support

Motion and state need typed `attr()`, in Chrome and Edge 133+ (Safari has it in Technology Preview). Elsewhere the icons are shown still, in their normal look. Strict Content Security Policies are fine: no inline style attributes are used.

## Checks

Run in the page (`/quality`) or from the console:

```js
await autosvg.verify(autosvg.getSVG()) // one drawing
await autosvg.poseLint() // data, rest identical, alive, smooth states, bounds, pivots
await autosvg.perfAudit() // style cost, recipe drawing cost, weight, against budgets
autosvg.a11yAudit() // glyphs hidden or labelled, named controls, 24 px targets, reduced motion
autosvg.morphAudit() // every vector morphed into the next: same commands at both ends, on the canvas, cheap
await autosvg.audit() // the whole set, including performance
```

After editing the pose table (`packages/core/src/poses/table.ts`): `pnpm seed` (writes the icon files; `pnpm seed:check` only verifies), then run the lints. If the number of channels or beats changes: `pnpm css`.
