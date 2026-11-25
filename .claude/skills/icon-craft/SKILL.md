---
name: icon-craft
description: Draw, verify and add icons to this set (recipes, poses, checks). Use for any task that adds or changes an icon.
---

# icon-craft

Read `references/lessons.md` first (the checklist is short). Then:

0. **Check the concept is new** (`ls packages/icons/svg | grep -i <word>`, and a synonym) and decide its silhouette in one line.
1. **Draw one icon first.** Add it to a batch file `packages/core/src/batches/batch-<n>.ts` (copy the latest batch: `recipes` and `poses` together; helpers come from `recipe-kit.ts` and `poses/dsl.ts`). Register the batch at the bottom of `recipes.ts` and `poses/table.ts` (`addRecipes(...)`, `addPoses(...)`).
2. `pnpm seed` writes the icon file from the recipe and runs the quick geometry check on it at once (bounds, centring with the exact shift, grid, gaps, loose ends). Fix what it prints before anything else. The shape count in `P(n, ...)` must match the recipe.
   - Diagonal or composite shapes: `pnpm geom "pp.transform(...)"` / `pp.boolean(...)` prints paste-ready path data. Junctions: `cubicAt`, `ellipsePoint`, `superPoint`, `rotateAbout` in `geo.ts`.
   - Poses: use the archetypes in `poses/dsl.ts` (`swing`, `rattle`, `flicker`, `press`, `lift`, `pop`, `stagger`); they keep every motion big enough to see.
3. `pnpm verify-icons <name> --sheet --motion` runs verify, pose lint and perf audit and writes `.cache/icons/sheet.png` and `motion.png`. **Look at both images** and at the `~ looks like` line (a near copy of an existing icon) (16, 24 and 48 px, neighbours, and the motion frames). Done means every check passes and the render is good, not only the checks.
4. Fix and repeat, at most 4 rounds per icon, then stop and ask.
5. Then do the rest of the batch the same way, in one command: `pnpm verify-icons a b c d --sheet --motion`.
6. Before finishing: `pnpm check`.

Motion and state must be real: a state is a persistent condition of the object, a motion a real verb; when in doubt leave it out. Parameters, not behaviours: the library only sets CSS numbers.
