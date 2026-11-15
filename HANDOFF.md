# Smiski Bounce Party handoff

## Resume here: Minigame backgrounds

The next session is for experimenting with backgrounds in Bumper Cars, Table Tennis and Pogo Race. Pogo now has a spring pixel park experiment (details below); Bumper Cars and Tennis have no new theme selected. The checkout was clean at `3e6948a` before this handoff edit. Run commands from the `hackhaven` directory and consult `AGENTS.md` for the palette and player identities.

All three games share the host’s 760 × 500 canvas, `#arena`. For scenery inside the playfield, draw it immediately after the renderer clears the canvas. For scenery around the playfield, look at `body.in-match::before` in `web/lobby.css`. That rule also covers calibration and phone controllers. Scope changes to the host and the intended game if those screens should keep their ivory background. Home and lobby already have a bedroom backdrop.

| Game | Where to experiment | What to check in play |
| --- | --- | --- |
| Bumper Cars | `web/race.js`: `paintTrampoline()` builds a cached surface. Add static scenery before the trampoline legs and rim, or draw moving scenery in `draw()` before compositing the trampoline. | The rim, blue nitro plume and ring-out marker should stay visible. |
| Table Tennis | `web/court.js`: `drawCourt()` draws the center divider and two views of the same court. Paint the backdrop before the divider. | Follow the ball and Supersmash flame on both halves and check the timing labels. |
| Pogo Race | `web/pogo.js`: `drawTrack()` paints the shared spring park SVG, animated birds and scrolling stone lanes before riders. Use its camera mapping for scenery anchored to the course. | Check a spread-out four-player race, Burst wind trails, distance signs and the finish flag. |

For a first experiment, change one renderer, play through its countdown and winner card, then return to the lobby. Put any new image in `web/` and register its exact public path and MIME type in `server.js`.

## Pogo spring park experiment (November 15)

Pogo Race now uses a pixel-art Central Park-inspired spring theme. `web/park-backdrop.svg` supplies the skyline, blossom trees, flowers, lawn and benches, shared by the arena and full-page background. `drawTrack()` paints camera-anchored stone pavers, pixel birds, park distance signs and rider charge plates. The existing 50 m signs, finish checks and Burst trails remain. Birds respect reduced motion. `pogo-park` is toggled with match state, so the theme clears on return to lobby; the phone controller and results also receive matching park styling. The SVG route requires a server restart.

Validation: 27 renderer scenarios checked 2–4 players, spread camera, Burst and finish with finite coordinates and balanced canvas state. All 3 focused Pogo tests and 14 gameplay/motion tests passed; the existing lobby integration test timed out. Browser visual QA remains outstanding: the in-app browser could not reach the separate development server on 3011, and native Chrome access was denied. Check countdown, four spread-out riders, Burst, finish, results, narrow phone and return to lobby before calling visual QA complete.

## Current audio and effects

The host randomly selects between Fireside Chill and Lobby Music 2 in the lobby, and Game Music 2–4 during play. `web/audio.js` handles playback and event cues. Super Boost chimes when charged and whooshes on use. Supersmash booms on paddle contact. Pogo Burst has a spring and coin chime. Phone vibration code was removed at the owner’s request.


## Pogo Race today

Two to four phones can pump by tapping **Pump** or by enabling motion and moving the phone up and down. All riders charge and jump together. Each cycle has 1.9 seconds to charge and 0.5 seconds in the air. Each jump travels 4 m plus 2 m per accepted pump. Seven pumps fill the meter and add a 5 m burst, for a maximum jump of 23 m. Distances and standings update together on landing. Once a rider reaches 350 m, the greatest landed distance wins; equal leaders share the win.

The current course scrolls past hills and widens when riders spread out. The bed theme was reverted. Lane ticks, 50 m signs, the vertical checkered finish and the flag arrow starting at 250 m are in place. The extra game canvas frame stays removed.

- `web/pogo.js` contains the simulation, motion detector, six rider poses and track renderer. The sprite sheet is `web/pogo-riders.png`.
- `web/pump.js` handles phone input and motion permission. Inputs carry a round number so a delayed pump cannot charge the next jump.
- `web/race.js` connects the simulation to the host canvas, standings, countdown and winner card. The track renderer records each rider’s drawn position and pose for the transition into the winner card.
- Run `node --test test/pogo.test.js` for charge limits, simultaneous landings, ties and motion detection.

## Shared game flow

The laptop hosts a room. Two to four phones join by QR or four-letter code. Each player keeps their nickname and slot color (green, blue, coral red or purple) through reconnects. Use matte ivory, dusty teal, sand and warm gray for scenery.

Home and lobby use a gently animated bedroom backdrop and a frosted-glass player stage. Players bounce on individual trampolines. Four form a diamond, and each phone highlights its own player. The host lobby stacks the three game buttons beneath the QR card. The host wordmark returns an active game to the room lobby, then opens home from the lobby. Pogo uses the spring pixel park; the other games and tennis calibration use plain ivory backgrounds.

All three games show a large 3–2–1 countdown on the host and phones. At the finish, the winner’s sprite moves into a card while the playfield remains visible through an ivory backdrop. The card pops with confetti, then moves left as final standings enter from the right. Narrow screens stack the card above standings. Ties show all winners. Reduced-motion mode presents the settled result. The host can rematch or return to the lobby.

## Other games

**Table Tennis.** Exactly two players compete, first to seven. With three or four phones connected, the host chooses the pair. The host presses **Start calibration** once for both paddles. Players hold phones edge-on and follow arrows through two rounds of left, right and forward strokes. A missed verification retries that direction. Each player gets a green check on completion; both must finish before the countdown. A phone may need a local tap to grant browser motion permission. Tennis uses motion only. Calibration has wider host cards and a slim tapered forward arrow. The serve announcement above the court was removed to prevent layout shifts.

The host shows two brown tables with a divider. Timing feedback uses words: Very early / Very late in red, Early / Late in amber, Perfect in gold. Three Perfects fill a player’s three-segment meter. It stays charged across points and non-Perfect returns. The next Perfect fires a pink **Supersmash** and empties the meter. Tennis rules live in `web/tennis.js`, rendering in `web/court.js`, and calibration in `web/motion.js`.

**Bumper Cars.** Phones have a joystick and Boost button. Directional cars battle on a trampoline; a credited ring-out earns one point. Five bumps into opponents charge Super Boost. The host ring and phone meter fill yellow and turn Supersmash pink when full. Regular boost launches at 2.4 units per tick and Super Boost at 3.4, with doubled collision impulse. A ring-out clears charge, freezes the car at the rim, and shows a flash, fade, impact ring and OUT marker before respawn. The host shows a timer and live standings. Physics lives in `web/sim.js`.

## Run and verify

From the checkout, use Node 22+, `npm ci`, `npm start` and `npm test`. The default port is 3000. The last public demo used **3005** and this [temporary HTTPS lobby](https://tiffany-damages-carried-weekend.trycloudflare.com). Check the link before sharing it again. For a replacement tunnel to a running server on 3005:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3005
```

`server.js` owns rooms, relays Socket.IO events and explicitly lists public asset routes. Browser files are read from disk, but server-side changes require restarting the process behind the demo tunnel. Restarting expires existing rooms. Refresh host and phones after client changes. Use trusted HTTPS to test physical motion.

The latest focused run passed all 11 Bumper Cars, Pogo and Tennis simulation tests after the vibration rollback. The lobby integration test timed out in an earlier run. Background changes need a visual check on the host, including the countdown and results overlay.
