# Icon system spec: pure line

Outline icons only: **0.75px stroke, round caps and joins, no fills, no backgrounds.**
Values live in [`packages/core/src/spec.ts`](packages/core/src/spec.ts). Icons are drawn and saved in the Studio page; geometry helpers
([`packages/core/src/geo.ts`](packages/core/src/geo.ts)) and Paper.js tools keep radii, symmetry and joins exact. The canvas checks
([`packages/checks/src/lint.ts`](packages/checks/src/lint.ts), [`packages/checks/src/measure/`](packages/checks/src/measure/), [`packages/checks/src/paper-tools.ts`](packages/checks/src/paper-tools.ts)) enforce the rules below live.

## Style: the set is driven by CSS variables

One icon set, many looks. A look is nothing but custom properties on any wrapper element (`:root`, a class, one button). The contract lives in [`packages/runtime/src/css/icons.css`](packages/runtime/src/css/icons.css).

| Variable                      | Default       | Does                                            | How                              |
| ----------------------------- | ------------- | ----------------------------------------------- | -------------------------------- |
| `--autosvg-stroke`               | 1.5           | line weight                                     | pure CSS                         |
| `--autosvg-cap`                  | round         | butt / round / square                           | pure CSS                         |
| `--autosvg-join`                 | round         | miter / round / bevel                           | pure CSS                         |
| `--autosvg-dash`                 | none          | dash pattern                                    | pure CSS                         |
| `--autosvg-color`, `--autosvg-size` | inherit, 24px | colour, size                                    | pure CSS                         |
| `--autosvg-radius`               | 1             | corner radius multiplier (0 sharp, 2 very soft) | runtime, **icons with a recipe** |
| `--autosvg-curve`                | 0             | 0 circles, 1 squircles                          | runtime, **icons with a recipe** |

Why two layers: CSS can restyle a stroke but cannot reshape a path (`d:` does not take `var()`). So `<autosvg-glyph name="home">` ([`packages/runtime/src/glyph.ts`](packages/runtime/src/glyph.ts)) reads the geometry variables and redraws from stored recipes ([`packages/core/src/recipes.ts`](packages/core/src/recipes.ts)). Change the look by changing an attribute, class or style; glyphs redraw by themselves. Stroke, cap, join, dash, colour and size need no JavaScript.

**Rule: every icon with rounded corners or circles must respond to radius and curve.** Radius acts on rounded corners (a rect with `rx`, or a small arc beside a straight edge). Curve acts on circles of radius 2 or more (smaller ones are details and stay round). That is enforced by the coverage lint: `autosvg.coverage()` lists any icon that has such features but ignores the settings, and the spec-check panel shows the same warning for the icon on the canvas. `missing` must be empty.

**Recipes** (every icon with corners or circles; the Quality page counts them) in [`packages/core/src/recipes.ts`](packages/core/src/recipes.ts) are what make an icon respond. A recipe must reproduce its saved icon exactly at default settings (`autosvg.recipeStatus()`), and where a line meets a corner or curve, the junction is computed from the settings so strokes stay connected at any value. Radii are clamped where a line meets an edge, and shapes with slanted corners (the alert triangle) keep their outer extents as the radius changes.

Run `autosvg.coverage()` for the current numbers. Icons with no rounded corners or circles (arrows, chevrons, plus, star, bolt, ...) have nothing to respond to, and 5 are exempt with a stated reason (`cloud` and `link` are built from lobes, `phone` is a sculpted handset, `pill` is a capsule, `palette` is an organic outline). Exemptions live in [`packages/checks/src/coverage.ts`](packages/checks/src/coverage.ts) and are listed in the coverage result. Every icon follows stroke, cap, join and dash. Proportions (width, skew) are deliberately not a setting: distorting the drawing is not a lever for this set.

Heavier weight is what breaks things: `autosvg.sweep()` lists the icons that fail at each weight, and stroke 2 broke 14 of the original 85 (not re-measured on the 50 added).

## Motion and state: choreography that lives in the SVG

An icon can do two different things, and they live side by side as two numbers a consumer sets on the icon or any ancestor:

| Variable                         | Range        | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--autosvg-motion`                  | 0 to 1       | a **momentary gesture**: a bell rings, an arrow lunges, a check draws itself. It plays and settles back to rest.                                                                                                                                                                                                                                                                                                                                              |
| `--autosvg-state`                   | 0, 1, 2, ... | **which state the icon is in**. 0 is its normal look; 1 and up are its named states (a microphone: 1 is off; Wi-Fi: 1 is weak, 2 is off; a lock: 1 is open; a sidebar: 1 is collapsed, 2 is wide). A state persists, so moving the number _is_ the transition: entering draws the slash, opens the lock, hides the arcs, and leaving plays it back. Any value in between is a valid frame, and a state number can be transitioned or animated with plain CSS. |
| `--autosvg-look-x`, `--autosvg-look-y` | -1 to 1      | for icons that look around (the eyes)                                                                                                                                                                                                                                                                                                                                                                                                                         |

Because they are separate, an icon can ring while it is off. The root of each icon says what it has: `data-motion="ring"` and `data-states="weak off"`. The names `mic-off`, `lock-open`, `wifi-weak` (and `unlock`) are the same icon in one of its states: **the set ships one icon, not two**, and these names resolve to it. This goes well beyond a slash: a state can **bring new elements into the icon**, **turn the whole icon** and **redraw parts of it** (see below). `<autosvg-glyph name="mic" state="off">` puts it in a state with an attribute, and a standalone static drawing of any state is available (`renderIcon('mic-off', ..., { inline: true })`) for consumers that cannot see CSS.

One fixed stylesheet, [`packages/runtime/src/css/poses.css`](packages/runtime/src/css/poses.css) (generated, about 10 KB, independent of how many icons exist), reads the data attributes with typed `attr()` and the variables. A part that moves carries up to four **beats**, each a few numbers ending in its index (1 to 4):

| In the SVG                           | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data-c`                             | which channel drives this beat (1 motion, 2 state, 3 and 4 look)                                                                                                                                                                                                                                                                                                                                                                                 |
| `data-k`                             | curve: 0 smooth ramp that holds (default), 1 pulse that goes there and back, 2 damped wave that settles. Beats on the state channel are always ramps (a state holds)                                                                                                                                                                                                                                                                             |
| `data-t` `data-w`                    | where in the channel's travel the beat plays: start and length (default 0 and 1; on the state channel the travel is 0 to the number of states)                                                                                                                                                                                                                                                                                                   |
| `data-n`                             | swings of a wave (default 2)                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `data-r` `data-x` `data-y`           | rotate (degrees), move (icon units)                                                                                                                                                                                                                                                                                                                                                                                                              |
| `data-s` `data-h` `data-v`           | scale both axes, x only, y only                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `data-q`                             | skew x (degrees)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `data-a`                             | opacity change                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `data-g`                             | draw the stroke on or off (-1 hides it; the shape carries `pathLength="1"`)                                                                                                                                                                                                                                                                                                                                                                      |
| `data-ox` `data-oy`                  | the part's pivot (default 12 12)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `data-st` `data-b` `data-o` `data-z` | an **accessory**: an element that exists only in a state (a slash through a microphone, a dot on a bell, rays on a bulb, a bolt in a battery, a check in a cloud). In the file it is invisible (`opacity="0"`); `data-b`, `data-o` and `data-z` say where it starts at rest (drawn amount, opacity, scale: 0 for nothing). It is drawn on or popped in when its state arrives and taken away again when the next state takes over (an exit beat) |
| `data-gr`                            | a group around the shapes that carries the beats of the **whole icon** (turning it, mirroring it). The shapes inside keep their own beats and move in the group's frame                                                                                                                                                                                                                                                                          |

A beat's numbers are the value at the top of its curve and beats add up, so a part can anticipate, move and settle, and parts can follow one another (a clapper swings late, a stroke draws after the one before it). The library never decides when anything moves, and an icon at rest is identical to its static drawing. The data averages about 270 bytes per icon.

All 117 icons have motion or states (about 450 beats). 49 of them have states, which makes 96 more names that resolve to them (`autosvg.aliases` lists them), and the eyes also look around. **What states can do:**

- **Bring things in.** The bell has `unread` (a dot pops in from nothing) and `off` (a slash is drawn and the dot is sent away). The cloud has four states, each with its own accessory (an arrow up, an arrow down, a check, a slash), drawn on as its state arrives and drawn off as the next takes over: that is `cloud-upload`, `cloud-download`, `cloud-done`, `cloud-off` from one icon. The light bulb has `on` (rays reach out one after another), the battery `charging` (the cells go, a bolt is drawn in), `file`, `bookmark` and `copy` have `done`.
- **Turn the whole icon.** Direction is a state: **one `arrow`** turns a quarter per stop (right, down, left, up, then up-right), so `arrow-left` is the arrow in its `left` state and the set no longer ships five arrows. The same goes for `chevron` (four directions), `more` (horizontal or vertical), `skip` (forward or back, mirrored) and `trending` (up or down, mirrored). The motion inside is carried in the group's frame, so a down arrow lunges down.
- **Redraw parts.** `play` has `pause`: the triangle is drawn off while two bars are drawn on, so nothing fades and nothing is swapped. `download` has `up` (the arrow turns to point up) and `done` (the arrow is drawn off and a check drawn on). `zoom` has `out` (the vertical bar of the plus is erased).
- **Share one axis.** Several states are stops on one number, so jumping between them animates through the ones in between.

Examples of motion: an arrow lunges and its shaft stretches to stay joined; the bell swings while the clapper lags and can be turned off by drawing a slash; a check erases and draws itself, then pops; chevrons step off one side and arrive from the other; the menu becomes an X as a state; Wi-Fi has a weak state (the outer arcs fade) and an off state (the arcs return and a slash is drawn); the sidebar has two states in a row, collapsed and wide.

**Only what makes sense.** A state exists only when it is a real, persistent condition of the object: off, open, closed, collapsed, weak, empty, lowered, italic. A motion exists only when it is a real verb: a bell rings, a scissors snips. Generic filler (wiggle, tilt, pulse, shake) was removed from about 70 icons, and gestures whose frames looked broken or meaningless (a wallet "flip", a mail flap turning inside out) were replaced or dropped. When in doubt, leave it out.

**Source of truth.** The table in [`packages/core/src/poses/table.ts`](packages/core/src/poses/table.ts) is the source (vocabulary: [`packages/core/src/poses/dsl.ts`](packages/core/src/poses/dsl.ts)). The icon files are generated from it: `pnpm seed` (add `--check` to only verify). An icon with a recipe is drawn from its recipe; an icon without one keeps its file's geometry. `S(from, [shapes], ...)` splits a path with several strokes into separate shapes first; `withStates(spec, ['off'], [stroke])` names the states and adds state-only strokes. Run `node scripts/gen-poses-css.mjs` if the number of channels or beats changes.

**Lint** (`autosvg.poseLint()`, or the Poses check on the Quality page). Each rule exists because of a mistake that happened:

- only known attributes with numeric values; beats contiguous and finished within the channel's travel; drawing shapes carry `pathLength`; the SVG is valid XML (a bare attribute with no value broke every image render); state beats are ramps; state-only strokes are invisible in the file;
- the saved file carries exactly the table's pose;
- **at rest the icon is identical to its plain drawing** (a dash of exactly 1 once cost the stroke its end cap);
- every channel an icon uses visibly changes it (sampled away from multiples of a quarter, so a wave is never sampled at its zeros);
- at any value of a channel, up to 1.25 for a spring's overshoot, the ink stays inside the canvas (icons that exit on purpose are marked `X(...)`);
- **smooth**: a state is walked in steps of 0.1 and no frame may have more than a third of its ink appear from nowhere or vanish compared with its neighbour (ink that merely slides, turns, grows or fades stays near where it was and does not count; a flip through a flat frame is exempt). Real states top out near 0.2. This is the check for the frames that "look broken" when scrubbed;
- **pivots**: a part that scales does so about a point on or near itself, or about a point shared with other scaling parts (a flip of the whole icon). Two tiles with swapped pivots were once flung across the canvas;
- **no cheap nudge**: the motion must not be a single beat or one move with one timing. Add anticipation, lag or a second part, or declare the icon `simple(...)` when one plain move is right (a gear turning). The second gesture only gets a note.

All 135 pass.

**Performance** (`autosvg.perfAudit()`, also part of `autosvg.audit()` and the Performance check on the Quality page) measures what the set costs the browser by forced style recalculation, which does not depend on the tab being visible: restyling all posed shapes when a pose number changes (about 28 µs per shape, 10 ms for the 356 shapes of the whole set), one icon on its own (about 0.1 ms: the realistic hover), drawing an icon from its recipe (at most 0.4 ms), pose bytes per icon, beats per icon and the stylesheet size, each against a budget in `packages/checks/src/perf-audit.ts`. Set pose numbers on the icon or a small wrapper rather than on `:root`: a change on a high ancestor restyles every posed shape below it.

**Limits.** Typed `attr()` is in stable Chrome and Edge 133+ only at the time of writing (Safari has it only in Technology Preview; Firefox's status is unclear). Where it is unsupported the icons simply stay still. Icons used as `<img>` or CSS masks cannot see CSS variables, so they stay static. A strict Content Security Policy is not a problem here (no inline style attributes are used). Shapes that draw on and off use their own `stroke-dasharray`, so a consumer's `--autosvg-dash` does not apply to them. Non-uniform scales also scale the stroke width in that direction (a little, on bars and eyes).

## Icon morph: one icon turning into another, shape to shape

[`packages/runtime/src/morph/`](packages/runtime/src/morph/) and [`packages/runtime/src/css/morph.css`](packages/runtime/src/css/morph.css): `<autosvg-morph from="sun" to="moon">`, driven by one number, `--autosvg-morph` (0 the first icon, 1 the second; `state="to"` sets it, or any CSS on an ancestor). It works for any two icons with no code per pair. CSS can interpolate a path's `d` only between two paths with the same commands, so the runtime splits each icon into its strokes, pairs the strokes of the two icons (a stroke is paired when moving it costs less than fading both), rewrites each pair with the same number of cubic curves (the shorter is subdivided at its longest curve), and chooses the start point and direction that line the pair up best. An unpaired stroke shrinks to a point and fades. Each stroke carries both ends as CSS variables (`--im-a`, `--im-b`) and `@container style(--autosvg-morph: 1)` picks one, so an ordinary CSS transition on `d` moves it; nothing is added to a stylesheet per pair. It is a switch with a transition, not a scrubber (a paused `@keyframes` scrubbed by `animation-delay: calc(var(--autosvg-morph) * -1s)` looked right when the number was set by hand and did nothing while it was transitioning: CSS reads `animation-*` before animations run). The plan (`autosvg.morphPlan(a, b)`) reports `rough` when most of the ink would fade instead of move; use the swap for such a pair. A state of one icon is still a state, not a morph. `autosvg.morphAudit()` (the Morph check on the Quality page) checks both ends of every stroke have the same commands, stay on the canvas, and are cheap to plan. Tested in Chrome 156; `d: path(attr(...))` does not work (the string must be literal), `d: path(var(--x))` does; without CSS `d` the icon changes instantly.

## Icon swap: one icon turning into another

[`packages/runtime/src/css/swap.css`](packages/runtime/src/css/swap.css) turns one icon into another with CSS only: two icons in a `.autosvg-swap`, and one number, `--autosvg-swap` (0 shows the first, 1 the second), set through `data-state="on"` or on any ancestor and moved by a CSS transition or animation. The first turns out (scales down, turns, blurs, fades) while the second turns in, with a springy easing. Tuning variables: `--autosvg-swap-duration`, `--autosvg-swap-easing`, `--autosvg-swap-turn`, `--autosvg-swap-blur`. Both icons are decorative; the button that holds them carries the label and state (`aria-pressed`). Under `prefers-reduced-motion` the change is instant. It works for any two icons; a shape-to-shape morph is a separate thing, `<autosvg-morph>` (below). States of one icon that can be expressed as movement (a menu becoming a cross, a lock opening) are better done with that icon's own pose.

**Entering and leaving differ.** An accessory leaves quicker than it arrives (it is drawn in over a full stop, and drawn out over 0.6 of one), and `<autosvg-glyph>` with a `state` attribute enters a state slowly and eased out (`--autosvg-state-enter`, 420ms) and leaves it quickly and eased in (`--autosvg-state-exit`, 240ms). The transition used is the one of the state being moved to, so there is no JavaScript. If you drive `--autosvg-state` from your own CSS, yours is the only transition. The menu shows it: open is a cross; back erases the cross, brings the middle line back as a shaft and draws a head on it.

**Anything that can be switched off draws a slash.** `mic`, `video`, `camera`, `bell`, `wifi`, `eye`, `volume`, `cloud`, `shield`, `image`, `link`, `bolt`, `music`, `chat`, `monitor`, `headphones`, `globe` and `map-pin` all have an `off` state, so `mic-off`, `shield-off`, `link-off` and so on need no files.

**Badges are states.** `user`, `folder`, `calendar`, `file`, `bookmark`, `shopping-bag` and `cart` share four marks, `plus`, `minus`, `check` and `x`, so `user-plus`, `folder-check`, `calendar-x` and `file-minus` are all the base icon in a state. A user makes room for its mark: the group around the person moves left and shrinks, then the mark is drawn in beside them.

**Mirrored pairs are one icon.** `undo` has `redo` (the group is mirrored) and `log-out` has `in` (`log-in`), so redo and log-in are names, not files. `server` is two units with blinking lights and an `off` state.

**Sort order is a state.** `sort` has three bars, longest first (descending); `asc` shortens the first and stretches the last, so `sort-asc` and `sort-desc` are one icon.

**Alignment is a state.** `align` is left-aligned text with three states, `center`, `right` and `justify`: the short lines move to the middle, then to the right, then back and stretch to the full width, so `align-left`, `align-center`, `align-right` and `align-justify` are one icon.

**Levels are states too.** `volume` has `low` (the outer arc goes) and `off` (the rest goes and a cross is drawn), so `volume-low` and `volume-off` are the speaker at stops 1 and 2. `heart` has `broken` (a crack is drawn down the middle).

**The status marks are one ring.** `circle` has seven states: `check`, `x`, `alert`, `info`, `plus`, `minus`, `help`, each mark drawn in as its state arrives and drawn out as the next takes over. `check-circle`, `x-circle`, `alert-circle`, `info`, `plus-circle`, `minus-circle` and `help-circle` all resolve to it.

**Two icons that differ by one stroke, one turn, one mirror or one accessory are one icon with a state: never ship both.** `eye-off`, `mic-off`, `lock-open` are states of `eye`, `mic` and `lock`, so a show/hide toggle is `--autosvg-state` going from 0 to 1 and the line is drawn on, with no fading or blurring. Use the swap only for icons that really differ, such as a sun and a moon.

The **Showcase** page puts icons in real components (mute, play and pause, show password, theme, copy, menu, lock, like, notification, delete, tab bar, Wi-Fi, download, charging, text alignment, cloud, bell, volume, user and folder marks), each driven by CSS: a pseudo-class, an attribute, a one-shot or looping animation, or a **scroll timeline** (`animation-timeline: scroll()` plays an icon's motion from a scroll position with no JavaScript). The eyes card is the one consumer that sets numbers from JavaScript (`--autosvg-look-x`, `--autosvg-look-y` from the pointer), to show that the library ships numbers and the consumer decides when they change.

## Weights and line styles

Default is **0.75px, round caps, round joins**. The Look menu (top right of every page; its stroke, corner, cap and join controls) previews other weights (0.25 to 3), square/butt caps and miter joins across the canvas, previews and gallery; the checks follow the chosen weight (live-area margin and the minimum gap both scale with the stroke). The controls only visualise the difference; they never change a file.

Measured with `autosvg.sweep()` on the original 85 icons; re-run it for the whole set (an icon "breaks" when a rule fails or strokes sit closer than one stroke width):

| Weight       | Icons that break                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| 1, 1.25, 1.5 | 0                                                                                                         |
| 1.75         | 6                                                                                                         |
| 2            | 14 (bell, cart, chip, eye, eye-off, filter, grid, send, shield, star, trash, user, users, alert-triangle) |
| 2.5          | 51                                                                                                        |

So the set holds from 1 to 1.5. Heavier weights need per-icon retuning (more spacing, smaller details), as professional sets do with separate weight files. Dots are tiny circles (`r=0.5`), so they grow and shrink with the weight.

## Structure

- One icon = one file in `packages/vectors/svg/`, `noun-modifier.svg`, kebab-case. An icon with a recipe is generated from its recipe plus the pose table (`pnpm seed`); an icon without one keeps the geometry in its file, and the pose table adds its motion.
- Canonical root, nothing else:
  `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`.
- Shapes carry geometry only: no `fill`, `stroke`, `opacity`, `id`, `class`, `style`, `transform`, filters or masks.
  All styling is inherited from the root, so the family re-themes with CSS `color` and re-weights in one place.
- Allowed elements: `path`, `circle`, `rect`, `line`, `polyline`, `polygon`, `ellipse`, `g`.

## Grid and live area

- 24×24 canvas, **20×20 live area** including stroke, so geometry stays within 2.75 to 21.25
  (in practice 3 to 21 on the half-grid).
- Keylines: circle Ø20, square 18×18, portrait 16×20, landscape 20×16. Fit the shape to the keyline, not the box.
- Primitive coordinates on a **0.5 grid**; paths at most 2 decimals. Prefer 45° and 90° angles.

## Shape language

- Corner radii from three tokens: **3** containers, **2** parts, **1.5** details (1 for the smallest).
- Round joins and caps everywhere; no sharp miters.
- Dots are tiny circles (`r=0.5`): with the stroke they render as solid dots and the icon stays pure line.
- Keep ≥ one stroke width of visible white (0.75px by default) between parallel strokes so 16px doesn't fill in. Measured, not eyeballed.
- Strokes that meet must really meet: an open end that stops 0.1 to 1px short of another stroke (or of its own start) is a broken connection. Closed shapes use `z`. Deliberate gaps are at least the minimum clear space.
- Centre the drawn extent in the canvas (within 0.75px). Directional glyphs (play, cursor) may sit off-centre on purpose.
- Repeated parts are generated, not drawn (gear teeth, sun rays), so they are identical.

## Detail budget

- One metaphor per icon, at most **8 shapes**. Simplify the idea, not the stroke.
- Test at 16, 24 and 48px. If it fails at 16px, remove detail.

## Accessibility

`autosvg.a11yAudit(root?)` (and the Accessibility check on the Quality page, which audits the Showcase rendered off screen) checks how icons are used in a page: every `<autosvg-glyph>` is hidden from assistive technology unless it is given a label (the runtime sets `aria-hidden="true"` itself), every control that holds an icon has an accessible name, every control is at least 24 by 24 CSS pixels (WCAG 2.2 target size), an `.autosvg-swap` is hidden, and the page's CSS switches icon transitions and animations off under `prefers-reduced-motion`. The rules below are what the audit enforces.

- `currentColor` only. Decorative icons get `aria-hidden="true"`; meaningful ones are labelled on the _button_.
- Never convey state by icon colour alone.
