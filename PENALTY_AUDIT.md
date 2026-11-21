# Brighton penalty shoot-out: mobile geometry and input audit
**Date:** 21 November 2026
**Release:** r106
**Page:** https://rdf32rdf32.github.io/Brighton/#shootout

## Reproduced source-level defects
1. **Swipes interrupted before reaching grass.** The older `site-r76.css` rule `.shootout-r66 .penalty-stage {touch-action:pan-y!important}` could cause mobile browsers to claim upward gestures and cancel pointer tracking, overriding an earlier same-specificity `touch-action:none`.
2. **Touch shot only worked when released inside the goal.** The game previously rejected an upward swipe whose end position was still below the painted line, even if the gesture and direction were valid.
3. **Touch-start zone too narrow.** A horizontal restriction near the ball ignored some legitimate gestures on the left and right of the pitch.
4. **Goal exaggerated on large mobile widths.** Width was expressed as a percentage of stage width, height as a percentage of stage height; the resulting aspect ratio exceeded 5:1 for wide mobile layouts.
5. **Unstable player layout under rotation.** The penalty taker's ready position used the transformed bounding-box height. It is now derived from the SVG's 170:290 aspect ratio and recalculated on resize/orientation changes.
6. **Unnecessary layout updates.** Goal-position CSS variables were rewritten repeatedly during pointer processing, including when geometry had not changed.

## Fixes on `main`
- `shootout-realism.css`: stronger `.shootout-v17.shootout-r66 .penalty-stage` selector sets `touch-action:none!important` for the playing area; thumb-visible 42 px pointer halo, foreground crosshair, and mobile frame-width calibration.
- `shootout-r82.js`: accepts upward swipes from **all grass below the painted goal line**, including releases that stay on the turf; live target preview; rejects taps and sideways/downward swipes; excludes UI buttons from kick-start gestures; uses requestAnimationFrame to render the physical pointer; caches goal geometry and goal-width calibration.
- `shootout-r82.js`: the rendered keeper visible height is targeted to 78% of the goal height, with feet on y = 315/650 of the scene. Taker top is derived from an untransformed SVG width and the location of the boots.
- `index.html`: revised controls, accessible instructions and release-cache versions.

## Geometry checks
Tests below ran the actual extracted `syncGoalBox`, `swipeShotTarget`, `isKickStart`, and pointer-motion functions from the committed JavaScript in an isolated test environment. Dimensions refer to **the game scene in CSS pixels**, not necessarily an entire device screen.

| Game scene (px) | Goal (px) | Frame ratio | Visible keeper height |
|---|---|---|---|
| 320 × 430 | 253 × 88 | 2.88 | 68 px |
| 375 × 443 | 284 × 94 | 3.02 | 73 px |
| 390 × 460 | 295 × 98 | 3.02 | 76 px |
| 430 × 507 | 312 × 103 | 3.02 | 81 px |
| 600 × 510 | 327 × 108 | 3.02 | 84 px |
| 760 × 510 | 327 × 108 | 3.02 | 84 px |
| 667 × 350, landscape | 307 × 102 | 3.02 | 79 px |
| 844 × 360, landscape | 315 × 104 | 3.02 | 81 px |

The goal baseline in every configuration is y = 315/650 = 48.4615% of stage height. Other key checks: pointer tracked to y = 448 on a 460 px scene (12 px edge gutter); the pointer remained visible while crossing into the goal; grass starts accepted at either side of the playing area; upward diagonal swipes mapped to left and right goal positions, while downward and tiny gestures produced no shot.

**Automated source-level audit:** 29 checks passed, none failed. JavaScript syntax parsed; CSS and SVG structures balanced; existing goalkeeper and scoring routines retained.

## Manual end-to-end checks still required
These tests are not a substitute for a live-device browser session. The published site could not be reached from the isolated test environment. After GitHub Pages finishes publishing, manually check:
1. iPhone Safari: start an Albion shot by touching the lower-left, lower-middle and lower-right grass; keep the finger low, swipe upwards and release *before* reaching the goal. Verify shot fires.
2. iPhone Safari: drag directly inside the frame for low corners, high corners and narrow misses. Check the finger halo follows all the way to the bottom (the last ~12 px are left free for the whole halo).
3. On a Palace kick, verify keeper lateral movement before the whistle, no pre-whistle dive, and reactive movement afterwards.
4. Rotate between portrait and landscape; the net must remain roughly 3:1 with the keeper on the white paint and the striker's boots on the pitch.
5. Android Chrome or another touch browser: repeat the swipe checks, then confirm there is no accidental page scroll while dragging inside the game.
6. Desktop: confirm mouse hover, aim, run-up, woodwork, ball flight, saves, restart, scoreboard and the completion of a full shoot-out.

## Scope
The football simulation probabilities and win/loss scoring were not rebalanced in this patch. The work focuses on mobile pointer reliability, frame geometry, player positioning and processing of gestures. Full device-level visual/performance verification remains outstanding.
