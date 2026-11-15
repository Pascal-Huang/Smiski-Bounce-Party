# Smiski Bounce Party handoff

## Resume here: Polish the backgrounds and minigames

This handoff was updated on November 15, 2026. **This checkout is already on `alvin-background-branch` at `aafdbef` (background v1), with the polish below uncommitted.** Continue in this checkout; no additional worktree is needed. Main at `3e6948a` has the earlier visuals. Consult `AGENTS.md` for the original typography, branding and player colors.

Start with a host playthrough from countdown to results and back to the lobby. The earlier checks covered simulation rules and some layout calculations. The latest visual changes still need an in-game check, especially at the 1263 × 631 host size used for feedback.

| Game | Current design on the background branch | What to check next |
| --- | --- | --- |
| Pogo Race | One spring Central Park scene with flying birds, Bow Bridge and full-width cobblestone lanes. Both bridge approach paths were removed. Rounded distance signs enter beside the leaderboard. Rider names sit 4 px from the left edge. Art lives in `web/park-backdrop.svg`, layout in `web/lobby.css` and `web/pogo.js`. | Try two and four riders through a Burst and the finish. Watch the first lane against the lake as the window resizes, names during jumps, and signs at the leaderboard edge. |
| Table Tennis | The supplied championship image is `web/tennis-stadium.png`. The two court views sit between the stands. Usernames sit on the pale floor above each table. Spectators bob during rallies and cheer on points. See `web/court.js` and `web/lobby.css`. | Play a point with two phones. Check name clearance, timing feedback, ball visibility and crowd motion, including reduced motion. |
| Bumper Cars | The trampoline sits on a 16:9 grass field with small, irregular patches and lighter grass behind the title. Its 76 px legs have rubber feet, contact shadows and a broader deck shadow. See `web/trampoline-field.svg` and `paintTrampoline()` in `web/race.js`. | Look first at the feet and shadows on a short host screen. Check clipping, title contrast and whether a ring-out or boost remains easy to follow near the rim. |

Host music and event cues already exist in `web/audio.js`. The standard UI and branding are the visual baseline for all three games.

### Latest polish pass (November 15)

- Bumper Cars now sizes its host canvas using its actual 760 × 540 aspect ratio. The former 760 × 500 sizing allowance made it taller than the available short-screen space, reducing clearance beneath the feet and shadows.
- Tennis balls now have an ivory surround, dark edge and small highlight for contrast on the brown table and pale floor. Supersmash balls and trails are pink, and all three charge segments turn pink when ready.
- Tennis names now sit on ivory strips with the player's persistent slot-color marker, including when the host selects a pair from three or four phones.
- All 14 simulation/motion tests pass. The lobby integration test also passes when run outside the sandbox; inside the sandbox, its initial Socket.IO connection fails with `xhr poll error` and the test times out. No room/server changes were needed.
- Visual QA is still pending: the in-app browser lost its tab connection before a playthrough could begin. Check these changes at 1263 × 631 and on phones, then complete the game-specific playthroughs listed above. No physical motion or reduced-motion browser check was completed in this pass.

## Pogo Race today

Two to four phones can pump by enabling motion and moving the phone up and down. All riders charge and jump together. Each cycle has 1.9 seconds to charge and 0.5 seconds in the air. Each jump travels 4 m plus 2 m per accepted pump. Seven pumps fill the meter and add a 5 m burst, for a maximum jump of 23 m. Distances and standings update together on landing. Once a rider reaches 350 m, the greatest landed distance wins; equal leaders share the win.

The course camera widens when riders spread out. Lane ticks, 50 m signs, the vertical checkered finish and the flag arrow starting at 250 m are in place. The extra game canvas frame stays removed.

- `web/pogo.js` contains the simulation, motion detector, six rider poses and track renderer. The sprite sheet is `web/pogo-riders.png`.
- `web/pump.js` handles phone input and motion permission. Inputs carry a round number so a delayed pump cannot charge the next jump.
- `web/race.js` connects the simulation to the host canvas, standings, countdown and winner card. The track renderer records each rider’s drawn position and pose for the transition into the winner card.
- Run `node --test test/pogo.test.js` for charge limits, simultaneous landings, ties and motion detection.

## Shared game flow

The laptop hosts a room. Two to four phones join by QR or four-letter code. Each player keeps their nickname and slot color (green, blue, coral red or purple) through reconnects. Use matte ivory, dusty teal, sand and warm gray for scenery.

Home and lobby use a gently animated bedroom backdrop and a frosted-glass player stage. Players bounce on individual trampolines. Four form a diamond, and each phone highlights its own player. The host lobby stacks the three game buttons beneath the QR card. The host wordmark returns an active game to the room lobby, then opens home from the lobby. Tennis calibration uses the shared ivory UI.

All three games show a large 3–2–1 countdown on the host and phones. At the finish, the winner’s sprite moves into a card while the playfield remains visible through an ivory backdrop. The card pops with confetti, then moves left as final standings enter from the right. Narrow screens stack the card above standings. Ties show all winners. Reduced-motion mode presents the settled result. The host can rematch or return to the lobby.

## Other games

**Table Tennis.** Exactly two players compete, first to seven. With three or four phones connected, the host chooses the pair. The host presses **Start calibration** once for both paddles. Players hold phones edge-on and follow arrows through two rounds of left, right and forward strokes. A missed verification retries that direction. Each player gets a green check on completion; both must finish before the countdown. A phone may need a local tap to grant browser motion permission. Tennis uses motion only. Calibration has wider host cards and a slim tapered forward arrow. The serve announcement above the court was removed to prevent layout shifts.

The host shows two brown tables with a divider. Timing feedback uses words: Very early / Very late in red, Early / Late in amber, Perfect in gold. Three Perfects fill a player’s three-segment meter. It stays charged across points and non-Perfect returns. The next Perfect fires a pink **Supersmash** and empties the meter. Tennis rules live in `web/tennis.js`, rendering in `web/court.js`, and calibration in `web/motion.js`.

**Bumper Cars.** Phones have a joystick and Boost button. Directional cars battle on a trampoline; a credited ring-out earns one point. Five bumps into opponents charge Super Boost. The host ring and phone meter fill yellow and turn Supersmash pink when full. Regular boost launches at 2.4 units per tick and Super Boost at 3.4, with doubled collision impulse. A ring-out clears charge, freezes the car at the rim, and shows a flash, fade, impact ring and OUT marker before respawn. The host shows a timer and live standings. Physics lives in `web/sim.js`.

## Run and verify

From the checkout, use Node 22+, `npm ci`, `npm start` and `npm test`. The default port is 3000. The last verified preview ran on port **3022** at [this temporary HTTPS lobby](https://lane-namespace-pct-brother.trycloudflare.com/). Quick Tunnel addresses expire. Check the lobby and multiplayer connection before sharing. For a replacement tunnel to a running server on 3022:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3022
```

`server.js` owns rooms, relays Socket.IO events and explicitly lists public asset routes. Browser files are read from disk, but server-side changes require restarting the process behind the demo tunnel. Restarting expires existing rooms. Refresh host and phones after client changes. Use trusted HTTPS to test physical motion.

The latest focused run passed all 3 Pogo, 4 tennis, 4 bumper-car and 3 motion tests. The lobby integration test passed separately outside the sandbox. Recheck the current working branch before publishing new changes.
