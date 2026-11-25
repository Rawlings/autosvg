# Lessons

What has worked and failed when drawing icons here. Read the checklist before drawing, not after the first verify fails.
Each entry says what was seen. No evidence, no lesson (see AGENTS.md).

## Checklist before you write a recipe

1. **Visible white = centre distance − 1.5** (the stroke). A line that does not join a stroke must be at least **3.0** between centres from it.
2. **Lines that meet must meet exactly.** An end within 0.1 of another stroke is joined; an end 0.1 to 1.0 away is reported as "stops short". Reuse the same coordinate.
3. **Primitives sit on the 0.5 grid**: circle `cx`, `cy`, `r` and rect `x`, `y`, `width`, `height`. Choose sizes so the centre lands on the grid (a 7 wide square has its centre at 6.5, an 8 wide one at 7).
4. **Paths keep two decimals.** If an arc needs a radius of 1.875, use 1.9; an arc radius slightly above half its chord is valid.
5. **Geometry stays in 2.75 to 21.25**; centre the ink within 0.75 of 12; the larger side should be about 16 or more or the set audit calls it small.
6. **Ends that join a rounded shape must land on its straight part at every radius setting**, or use `superPoint` / the same radius expression. Check the radius cap of `R(base, p, max)`.
7. **Look at the sheet next to the neighbours.** An icon that is only a lens plus a stem is the existing `leaf`.
8. **Before drafting, decide the concept and check it is new:** `ls packages/vectors/svg | grep -i <word>` and think of a synonym. The look-alike report only catches near-identical drawings.
9. **Poses:** each shape belongs to one part, or to parts with the same pivot (the last pivot wins). Parts that touch must move together. Two beats with different timing or properties, or `simple()`.

## Entries

### Inner detail needs room (promoted to checklist 1)
- Seen: a flashlight switch 2.5 from its walls gave "narrow gap 0.91px" (two parallel stretches, 3 long). Moving the walls to 3.5 from the switch passed. Short near-misses (a dot 1.0 from a line end, as in the alert-triangle) are not reported: the raster check only reports stretches 3 or more long.

### Joins are exact (checklist 2)
- Seen: a feather spine ending 0.71 from a barb's start gave "stops 0.71px short". Two barbs 4 apart in a 9.5 wide vane read as a chunky ladder; one barb joined at both ends read as a feather.

### Grid and decimals (checklist 3, 4)
- Seen: circle centres at 6.75 and 17.25 (glasses, qr-code) and a rect at x 2.75 (hard-hat) warned "not on the 0.5 grid"; a path with radius 1.875 warned "more than 2 decimals". Using 7 and 17, 3, 1.9 passed.

### Look-alikes (checklist 7)
- Seen: the first feather (a lens and a quill) was a second `leaf`. Found only by looking at it, not by any check.

### The quick check, calibrated (`pnpm quick`, `pnpm seed`)
- Run on the 259 known-good icons it gives 0 failures and 4 warnings (gamepad, glasses, hard-drive, trophy: curved shapes 0.5 to 0.7 apart that the pixel check accepts). Fed the first drafts of the pot, flashlight, feather, glasses, hard-hat and cake, it reported all six mistakes (off-centre with the shift to apply, a 1px channel, an end 0.71px short, off-grid circles, an off-grid rect, three decimals).
- Its first version flagged 40+ known-good icons: the flare where strokes cross at a shallow angle looks like a narrow gap to a distance-only check. Only a steady channel under 1.1 of white, 3 or more long, is reported, and the file markup must have its state shapes stripped first.

### Look-alikes (`~ looks like` in verify-icons)
- Plain pixel difference could not tell: it rated feather and leaf 44% apart but circle and radio 0%. Counting how much of each icon's ink lies within half a unit of the other's rates feather/leaf at 6%, glasses/infinity at 0%, and 48 of the 259 icons have a twin under 10% (alert-circle/info, circle/radio by design). Warn under 8%, and judge it: some twins are deliberate.

### Tooling
- Paper.js now runs without a DOM (`withShapes`, `transform`, `pnpm geom`). The shape analysis it gives is identical to the old browser-only one on all 259 icons (kinks, loose ends, inflections, symmetry).
- `pnpm verify-vectors <names> --sheet --motion` checks and draws in about 5 s and gives one image for a whole batch. Twenty separate screenshots cost far more.
- Biome reformats between edits, so a Python string patch written against earlier text stops matching. Put a batch in its own file under `packages/core/src/batches/` and format before patching.
- `cmd && cat > file <<EOF` loses the file when `cmd` fails. Write files with the Write tool.
- The install hook reads `2>&1` as a package name: a bare `pnpm install` only. Never `pkill -f vite` (it can stop someone else's server); stop a server by its port.
- Do not draw a contact sheet over the studio (AGENTS.md). `verify-vectors` draws in its own headless page.

### Motion needs to be big enough to see
- Seen in the filmstrip (`--motion`): a pot lid moving 0.5 px and a window shifting 0.4 px were invisible at 56 px even though pose lint passed ("alive" only needs 0.4% of the ink to change). 0.9 px with a 4° tilt, and 0.7 px, read. Aim for at least 0.8 px or 3° on the main gesture.

### Compute the centre before writing (checklist 5)
- Seen: a pot spanning y 5.5 to 21 failed "off-centre by 1.25" on the first verify. Adding the top and bottom and halving it takes five seconds; do it for every recipe.

### Draft-first is fast but needs a concept check
- Six icons drafted, checked and looked at in 60 s (10 s each, timer started before designing). All six passed every check, and four still had to be dropped: `trashcan` was the existing `trash` (13% different, far above the 8% warning), `mug` was the existing `coffee` (19%), `mailbox` read as a toggle and `tooth` was lumpy. Checks measure geometry, not recognisability, and the look-alike report misses semantic duplicates. Two kept (lighthouse, crayon). Think for one line about the silhouette and the existing names, then draft.

### The revised protocol worked (concept check, then draft)
- Eight household objects in 102 s including design (12.8 s each), 8 of 8 kept. Half needed one fix pass, and `seed` named every problem within seconds of writing: kettle off-centre by (1, 0.56) with its bail missing the straight edge, a lantern base only 2 below its body, a lever 2 from a wall, a dot crowded by walls. Vase and lantern are the weakest drawings; washing-machine is 6% from speaker (kept: different object, same plan).

### The MCP server (`.mcp.json`, `tools/src/mcp.ts`)
- One `vectors_apply` call (write batch, seed, quick check, verify, sheet and motion images) takes 1.7 to 2.6 s warm for 1 to 8 icons; the CLI route was about 5 s per command and 4 commands. Most of the 2.5 s is `nearest` (0.5 s, rasterising the whole set again after each page reload) and pose lint (0.25 s).
- It did not get a batch under 10 s per icon: 8 garden tools drafted in 107 s (13 s each, 6 kept). Tool time was roughly 15 s of that; the rest was writing the recipes and fixing what `seed` reported. The ceiling is generation, not tools.
- The quality gate caught 7 of 8 drafts at seed time (centring shifts, a dome missing the straight edge, a 34° tip read as a kink) within 0.3 s. Two drafts looked wrong anyway (a cluttered wheelbarrow, a birdhouse that read as a price tag) and were dropped: checks do not see this, only the sheet does.

### Depth in CSS (`depth.css`, Showcase "Depth, opt in")
- What worked: an SVG lighting filter (blurred alpha as a height map, diffuse and specular lights, sourced from a `data:` URL so no extra DOM) turns the 1.5px strokes into glossy tubes in any `--icon-color`; a `drop-shadow` chain driven by registered `--icon-lift` and `--icon-light` animates the cast shadow with a plain transition; a pseudo-element with `mask-image` of the icon plus `backdrop-filter` gives etched glass whose shadow tints the real backdrop; fourteen stacked copies with `translateZ` give real thickness (CSS 3D does not reach inside an SVG, so each layer is its own element).
- Cost (headless Chrome, CPU rendering, so pessimistic), one icon animating among N with tube and shadow: 50 icons about 50 fps, 200 about 14 fps. Everything animating at once (20 icons) about 43 fps. Put the tube filter on the inner svg and the shadow on the host: with both in one filter chain every lift change re-lit the tube (53 ms at 50 icons, 45 ms after the split, and the one-hovered case is the realistic one at 19 ms).
- The in-app browser pane throttles `requestAnimationFrame` to 1 Hz when hidden, which made a first benchmark meaningless. Measure frame times in headless Chrome (`pnpm shot` for pictures at 3x).
- Lighting filters are size dependent (the lighting uses pixel slopes), so the tube is tuned for about 48 to 160 px.

### Real 3D from the plain SVG (`apps/studio/src/lib/tube3d.ts`, `tube-gl.ts`, Showcase "Real 3D")
- It works with no new format: `morphPlan(a, b)` already gives every stroke as paired cubics with the same structure at both ends, so sampling 8 points per cubic gives a chain of capsules (one cylinder per segment, one sphere per point). Instanced WebGL2 draws a whole icon as a few hundred instances; the morph is one uniform `uT` blended in the vertex shader, and strokes with no partner shrink in or out through a radius factor. Seen working in the in-app browser: bell to rocket mid-morph, turned 55 degrees with parallax, copper and gold.
- The soft cast shadow is a planar projection drawn from above into a 256 px texture (union, no accumulation) and blurred on a floor quad with a 32-tap golden-angle spiral. 12 fixed taps showed a visible streak pattern; the spiral is smooth.
- `dispose()` must not call `loseContext()`: a hot reload (and React Strict Mode) remounts on the same canvas, and a canvas whose context was lost returns that dead context, so every shader then failed with a null info log. Free the buffers only.
- Biome's `useHookAtTopLevel` flags WebGL's `gl.useProgram` as a hook; exempted for that one file in `biome.jsonc`.
- Not measured: GPU frame cost, and the reduced-motion path (no sway, instant morph) was written but not exercised.

### Cross-page look (`apps/studio/src/app/look.ts`, `carried.ts`, `components/LookMenu.tsx`)
- One store holds what follows you: the carried icon, the engine's style (stroke, radius, curve, cap, join), the 3D material, depth and puff. It is saved in localStorage, read from a link (`?vector=&material=&stroke=...`, then stripped from the address) and applied before the first render. Checked in the browser: a full reload on /motion with no `?vector=` kept `lock` selected, stroke 2.5 and a copper accent; every header link carried the icon (`/studio/lock`, `/motion?vector=lock`); a shared link applied gold, stroke 1, radius 0.
- The engine already published the style as `--icon-*` on the page, so every Glyph followed it for free. What did not follow was the 3D: it needed the stroke as tube thickness and radius and curve passed to `morphPlan(from, to, style)`, so the shape itself reshapes.
- Where you are names the icon: `/studio/<vector>` or `?vector=`. The header syncs the address into the store; pages read `useCarried()`. Do not give a page its own `useState` for the selected icon (Motion had one: it ignored where you came from).
- Page changes use `document.startViewTransition` with `view-transition-name: carried` on the Library's detail stage and the Showcase's 3D stage, so the icon's stage travels between pages. Counted two transitions for two navigations; the animation itself was not watched frame by frame. Same-page and `replace` navigations skip it, and reduced motion turns it off.
- All 289 icons build tube data without error or NaN (96 cylinders on average, 328 at most, about 0.4 ms each).

### One file, every look (Showcase `Styles.tsx`)
- User correction: the Showcase must be about the icon they picked, not fixed bell, lock and bolt demos; they disliked the "Tube and shadow" card. The old Depth section is gone; `depth.tsx` keeps only the `Knob`. `<icon-glyph>` draws plain inline SVG in the page, so CSS reaches the paths: 21 treatments (glass, slab, neon, gradient ink, hollow, contours, dotted, drawn, long shadow, sticker, chromatic, blueprint, hologram, liquid, echo, kaleidoscope, wallpaper, tilt, letterpress, breathing, stitched) are all the same file plus `--icon-stroke`, `--icon-dash`, masks, filters and blend modes.
- Scale a tile's stroke from the Look instead of hard-coding it: `.fx-stage { --s: var(--icon-stroke, 1.5) }` and `--icon-stroke: calc(var(--s) * k)` on the glyph. Setting both on one element is a cycle. Checked: stroke 1.5 to 2.5 moved the dotted tile 1.425 to 2.375 and the sticker 7.5 to 12.5.
- Stacked layers: an element with a `filter` or `transform` paints above a plain one whatever the DOM order (Stitched hid its thread under the filtered cloth until the thread got `position: relative; z-index: 1`). Thick strokes are clipped by the svg box: `overflow: visible`.
- Thick strokes fill a detailed icon into a blob (rocket at 2.2 to 3.6 times the stroke). Keep the front stroke near 1.5 times and put thickness only in the layer behind. Dotted needs spacing about 2.8 times the dot diameter.
- Seen working in the in-app browser with rocket and camera; a11y audit over the grid clean (78 decorative icons). Not measured: cost of 21 animating tiles (they sit in `content-visibility: auto`), reduced motion not exercised.

### One Look menu, Motion merged into the Library, industry styles
- User correction: the look was configurable in four places (Library rail, Studio inspector, the 3D card, a header menu) and the Motion page duplicated the Library's icon grid. Now ONE place: the header Look menu (stroke, corner radius, curve, caps, joins, material, depth, 3D puff, link, reset). Checked in the browser: the only other control left on the Showcase is the 3D Turn angle (a camera, not a look). The Motion player moved into the Library's detail panel (state, motion and look channels; frames and SVG data in folds); `/motion` redirects to the Library with the icon. Rule for the next page: never add style controls to a page, read the shared look.
- A masked tile cannot hold its own decoration: children of an element with `mask-image` are clipped by the mask (the rose-gold sparkles would have vanished), so put them beside it, not in it.
- Industry groups (Finance, Games, Health, Food, Kids, Sport, Developer tools, Architecture, Fashion, Music, Travel, Space, Safety, Beauty) hold 39 more treatments, 60 tiles in all, every one the same file. The ones that rebuild the picture from cells (pixel art, LED matrix, ASCII, constellation) rasterise the SVG once to a small canvas (`useRaster`) and work for any icon: checked with heart, rocket and camera.
- Fixes found by looking: a tracer dash of `30 400` is on the path only about a quarter of the time, use a short repeating dash (`14 34`) and animate the offset by one period; an isometric stack at 110 px with `rotateX(58deg)` squashes to a sliver, use about 150 px.
- Not measured: cost of 60 tiles (they sit in `content-visibility: auto`; about 43 fps in the in-app pane with the menu open, a rough figure), reduced motion (one rule turns every tile's animation off) not exercised.

### Look simplified, Showcase cut down
- User corrections, in their words: the 3D puff "is weird, remove it"; "dont like that you selected material, cant it just be a color picker"; "the depth selection makes no difference"; "get rid of these bloat messages". The look is now stroke, radius, curve, caps, joins and ONE colour (`<input type=color>`); the 3D shading is a fixed polished metal. A control that visibly changes nothing (depth) is a bug in the design, not a setting: drop it. Explanatory microcopy in a menu or panel (ledes, tips, "a preview, no file changes") is removed unless it prevents a mistake.
- The old fixed demos (volume, menu, lock, status, tabs, and so on) and their CSS are deleted: the Showcase is the carried icon, in 3D, in real places, and 60 tiles in 15 industry groups; every old "technique" was filed under an industry. CSS for removed components was pruned by script (rules whose `.sc-` classes appear in no remaining `.ts` or `.tsx`): 1269 to 908 lines, page checked after.
- When a Biome run reformats a file, string-matching edits written for the old formatting silently miss (three tiles did not land in their groups until tsc reported them unused). Match with a regex that allows whitespace, and let `tsc` confirm.
- The batch files in `packages/core/src/batches/` went missing from disk during this session (the repo was never committed, so git could not restore them); the user found and restored them. The generated `index.ts` then imports files that do not exist and the app fails to load. Commit the repo, and never run `pnpm seed` while a batch file is missing: seed would rewrite icon files without their recipes and poses.

### Colour in the tiles: judgement, not a blanket rule
- First attempt re-hued every tile palette from the picked colour (one script, 137 colours). User correction: "not EVERY palette... like barber pole doesnt make sense to shift the barber colors, you need to use some judgement". Rule now (see the comment at the top of `industries.css`): a convention or a material stays fixed (barber stripes, hazard yellow, gold and brass, chalkboard green and wood, an ECG trace, terminal green, paper, RGB split, the meter colours, colourways); the SUBJECT (an ink, a lamp, a glow, a thread) is the picked colour itself, with `--c-l`, `--c-d`, `--c-p`, `--c-m`, `--c-x` for what goes with it; scenery and supporting colours follow by turning their hue (`--k-xxxxxx`, same lightness, chroma scaled, hue shifted).
- Mechanism: fixed stages reset `--cr` to the default colour, so every `--k-*` gives the original palette; with the default colour all of them are identical to the original (checked: `#ff7a59` resolves to the same OKLCH). Relative colour syntax (`oklch(from var(--c) l c calc(h + 45))`) is what makes this CSS-only.
- A rotated subject is not the user's colour: neon pink turned 220 degrees became cyan, not the picked blue. If the user picks a colour, a subject that should read as "their colour" must use it directly.
- Looked at with blue (`#2f6df0`) and green (`#2fa66a`): subjects followed, conventions held. Not checked: every colour on every tile (a very dark or grey pick keeps a floor of chroma 0.04 so tiles do not go flat).
- Stroke can now go to 0.25 (slider 0.25 to 3, step 0.05; engine clamp 0.25). At 0.25 the 3D tube and the small icon buttons become hairlines, which is what was asked for.
- A look that came in a link was applied but not saved until something else changed, so a reload dropped it. `bootLook` now saves once after applying.

### Motion and state in the Showcase, 2D and 3D (`PoseBar.tsx`, `liveTubes` in `tube3d.ts`)
- User idea: put the icons' motions and states in the Showcase, including the top 3D demo. Motion and state are only two CSS numbers (`--icon-motion`, `--icon-state`), so the Showcase root carries them: every 2D tile inherits them (registered properties inherit), no tile needed changing. Checked: during Play the neon tile read the same motion value as the root.
- The 3D tubes cannot read CSS, so a hidden `<icon-glyph>` (inside the same root, `visibility: hidden`, not `display: none`) inherits the same numbers and the renderer reads it every frame: each shape's `getScreenCTM()` (the pose CSS moves parts with transform, rotate, translate and scale, and it is included), its opacity, and how drawn on it is (the pose CSS draws with a dash of `--L` times the stroke, with `pathLength="1"`; drawn fraction is the first dash value divided by 1.02). Points come from `getPointAtLength`; a shape scaled to nothing, or invisible, gets no tube. This handles state-only parts too: bell `off` draws the slash and `unread` adds the dot in 3D (seen), lock `open` swings the shackle (seen). Reading the bell's shapes at motion 0 / 0.15 / 0.3 / 0.55 / 0.8 / 1 gave rotations 0 / 4.2 / -6.6 / -5.8 / 1.9 / 0 degrees: a subtle gesture, hard to see in a still frame next to the idle sway, so test motion with Play or with a state, not one frame.
- Rendering: the renderer keeps its buffers and refills them (`bufferData` DYNAMIC_DRAW) instead of making new buffers and vertex arrays each frame. At rest it goes back to the morph-built geometry.
- Side effect found by looking: a page-wide `--icon-state: 1` also switched the strip of other icons and the tab-bar neighbours to their own state 1. Other icons on the page are pinned to rest (`--icon-state: 0` on their glyph). When a number is set high up, ask which icons below are not the subject.
- A new icon must start at rest instantly: with the 700 ms glide the old state 1 showed on the new icon for a moment (read back as 1 at 300 ms). The reset turns the transition off for that one write.
- Not measured: frame cost of live mode (about 100 to 330 cylinders rebuilt per frame), and icons whose pose CSS changes the stroke width or moves several parts in a group were not all looked at.

### Process
- Designing 20 icons' coordinates in one go took 6 min 40 s of 10 min 45 s, and 6 of 20 needed a fix. Draw one, look at it, then do the rest.
