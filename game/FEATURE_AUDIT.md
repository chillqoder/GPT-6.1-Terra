# Feature audit

Baseline: the workspace contained only `game.md`; there was no playable project to preserve. The candidate was inspected in Chromium and exercised with the real fixed-step simulation. This table records the subsequent focused review and its final verification status.

| Feature or defect | Current state and evidence | Player benefit | Priority | Decision | Acceptance check | Final status |
| --- | --- | --- | --- | --- | --- | --- |
| Jump height and block strikes | Working: measured tap 2.76 and held 5.43 units in simulation | Predictable movement and reachable blocks | P0 | Retain | A tap hits the first block; a held jump reaches five units | Verified by `npm test` |
| Transient render objects | Broken: candidate reconstructed character meshes and badge textures on every frame | Sustained play and repeated restarts use fewer resources | P0 | Fix | Reuse actor meshes; remove them after their entities expire | Implemented in `view.js`; browser reload and simulation tests pass |
| Reward feedback | Partial: score changed, but point awards had no visible local feedback | Makes rewards and chains understandable | P1 | Implement | A point or 1-UP label appears at the award location and expires | Implemented in `game.js` and `view.js`; browser inspection |
| Fire costume and movement poses | Partial: Fire Mario used the normal palette and the character remained rigid | Power state and motion are easier to read | P1 | Improve | Fire outfit changes color and limbs animate during motion | Implemented in `view.js`; browser inspection |
| Projectile ceiling collision | Broken: projectile could survive a ceiling strike | Predictable fireball behavior | P1 | Fix | A fireball is removed when it hits a ceiling | Implemented in `simulation.js`; automated check |
| Enemy contact | Partial: walking enemies did not turn apart | Encounters remain readable when enemies meet | P1 | Implement | Walking enemies reverse on contact | Implemented in `simulation.js`; automated check |
| Cellar entry and return | Working: requires a centered down press on pipe; area and discoveries persist | Optional exploration with an understandable exit | P1 | Retain | Travel both ways without duplicate discovery | Verified by `npm test` |
| Scoring and finish | Working: flag bonus, time conversion and timer-digit fireworks use captured displayed time | A satisfying, accountable finish | P1 | Retain | Exact bonus accounting and one win transition | Verified by `npm test` |
| Mobile presentation | Partial: the first portrait view made the game world too small | Playable on a small screen | P1 | Improve and verify | HUD, overlay, and buttons fit portrait and short landscape | Camera adjusted; Chromium inspection at 390 × 844 with touch emulation and 844 × 390 |
| Surface route and landing margins | Partial: the first candidate’s gap was tight for a running jump | More forgiving first gap | P0 | Narrow the first gap | Small and Big reach the flag without secrets or protection | Implemented in `simulation.js`; both routes pass in `npm test` without losing a life |
| World 1-1 accuracy | Intentional adaptation: original-inspired course and one checkpoint, rather than a tile-for-tile recreation | Forgiving play and room for secrets | P2 | Retain | Surface route remains optional-secret free | Both automated surface routes pass |
| Character and effects polish | Partial: simple box poses and no impact particles or contact shadows | Clearer motion and more grounded visuals | P1 | Partly implemented | Distinct poses, warning, effects and shadows are visible | Partial: basic poses and warning added; particles and shadows remain missing |
| Additional worlds, bosses, moving platforms | Missing by design | Could expand the game later | Future | Defer | Outside the first-course brief | Deferred to keep the course focused |

## Verification and limitations

- `npm test` exercises movement caps and braking, tap and held jump height, coyote time, jump buffering, prevention of double jumps, the first block, tall-pipe landings, single-use and multi-coin blocks, shell brick removal, flower-after-damage behavior, pipe travel, three deaths and restart, projectile ceiling removal and shot limits, enemy separation, flag scoring, fireworks, and complete Small and Big surface routes. The routes drive the same simulation used by the browser and use no secret, debug invulnerability, or life loss.
- Chromium was used to start the game, move and jump with the keyboard, pause, inspect a touch-emulated portrait viewport and a short landscape viewport, and drive the finish through the inspection API. The result panel and saved record were inspected. The final browser console had no errors.
- The scripted finish and route checks do not replace a full manual playthrough. Audio output was not audibly verified, and storage-failure behavior, every shell-chain edge case and extended performance have not been exhaustively tested.
- Some specified polish remains partial: models use simple box animation rather than shoulder and hip pivots; there is no impact-particle system or contact-shadow system; skid and throwing poses, shell waking blink, and the clear fanfare are deliberately simple. The cellar has a distinct background and music but uses a simple transition. These are not claimed as completed or verified.
- The first gap was narrowed from the suggested three units to two units after the candidate route exposed a tight landing. The course uses a checkpoint and a non-identical layout as deliberate accessibility adaptations.

A final browser recheck after the last cosmetic pose and audio edits could not be launched because the browser tool was denied write access to its cache. The simulation regression was rerun after those edits.

## Animation and visual-defect pass

| Feature or defect | Previous state | Change | Final status |
| --- | --- | --- | --- |
| Coins drifting across the screen | Each coin group was rotated around the world origin, so coins orbited far from their real positions | Coins are pivoted at their own center and spin in place | Verified in browser |
| Fireball stream | Holding Shift to run threw a fireball every 0.25 s | Fireballs are thrown on a fresh Shift/X press; projectiles sit on their hitbox, spin, leave a trail, and puff on impact | `npm test`; browser inspection |
| Mario poses | Rigid model; limbs rotated around their centers; never turned | Pivoted hips, shoulders, and waist; idle breathing and blinking, walk/run cycle, jump and fall poses, skid with dust, duck, throw, landing squash, death, pipe, and flagpole poses; turns toward the facing direction | Browser inspection |
| Power-up and damage transitions | Instant size swap after a 0.25 s pause | Size flicker on growth and shrink, palette flashes on the flower, star palette cycling with sparkles | `npm test`; browser inspection |
| Enemies | Static models; shells were a squashed Koopa | Goomba waddle and stomp flattening; Koopa walk with a separate shell model, spinning slide, and wake-up shake; fire, star, shell, and block defeats flip enemies and drop them off screen | `npm test`; browser inspection |
| Block and reward feedback | No coin, debris, or sparkle effects | Question blocks shimmer; bumps squash; coins pop out of blocks; bricks shatter into debris with a small camera shake; collected coins and power-ups sparkle; fireworks burst into particles | Browser inspection |
| Ambient motion | Static flag and clouds | Flag cloth waves; clouds sway slowly | Browser inspection |
