# Smiski Bounce Party handoff

## Resume here (November 16, 2026)

The phone-controlled game is on `main` in `hackhaven/`. The latest gameplay commit is `8f8e432`. Start with a two-phone Table Tennis rally on the 1263 × 631 host display. Land four Perfect returns and listen for the launch and the separate impact. Judge whether the crackle is audible over the game music on laptop speakers.

| Game | Current presentation and controls | Next playtest |
| --- | --- | --- |
| Table Tennis | The stadium retains the top-center SMISKI sign. Timing grades appear below the player names. The tables and smash bars sit lower, with a shortened center divider. | Check label clearance and the Supersmash burst in both court views. Reset calibration midway, then finish a round and rematch with the same phones. |
| Pogo Race | Riders pump by moving a phone up and down after granting motion access. A frosted countdown card shows the two-handed landscape grip. The park has full-width cobblestone lanes and 50 m signs. | Try two and four riders through a Burst and the finish. Check the first lane against the shoreline as the host resizes. |
| Bumper Cars | The trampoline stands on the supplied grass texture. The frosted countdown card shows the controller grip. At normal zoom, the controller blocks accidental pinches while steering and boosting. An already enlarged page allows pinch recovery. | Hold the joystick and press Boost on a physical phone. Check zoom recovery, the trampoline feet and ring-outs on a short host screen. |

## Offline itch.io edition (settled)

The keyboard edition is archived for reference in `../hackhaven-itch` on branch `itch-local-multiplayer` at `d3bbb1b`. Current playtests focus on the phone-controlled game on `main`.

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

**Table Tennis.** Exactly two players compete, first to seven. With three or four phones connected, the host chooses the pair. The host presses **Start calibration** once for both paddles. The pre-calibration diagram shows a one-handed sideways grip, thumb along the upper edge and fingers underneath. The host can use **Reset both paddles** during setup. A results-screen rematch reuses calibration for the same two connected players. Players hold phones edge-on and follow arrows through two rounds of left, right and forward strokes. A missed verification retries that direction. Each player gets a green check on completion; both must finish before the countdown. A phone may need a local tap to grant browser motion permission. Tennis uses motion only. Calibration has wider host cards and a slim tapered forward arrow. The serve announcement above the court was removed to prevent layout shifts.

The host shows two brown tables with a divider. Timing feedback uses words: Very early / Very late in red, Early / Late in amber, Perfect in gold. Three Perfects fill a player’s three-segment meter. It stays charged across points and non-Perfect returns. The next Perfect fires a **Supersmash** and empties the meter. At the bounce, a gold shockwave and orange sparks appear in both views. A separate bass impact, sharp snap and four fading crackles play on the host through the effects channel. Audio lives in `web/audio.js`. Tennis rules live in `web/tennis.js`, rendering in `web/court.js`, and calibration in `web/motion.js`.

**Bumper Cars.** Phones have a joystick and Boost button. Directional cars battle on a trampoline; a credited ring-out earns one point. Five bumps into opponents charge Super Boost. The host ring and phone meter fill yellow and turn Supersmash pink when full. Regular boost launches at 2.4 units per tick and Super Boost at 3.4, with doubled collision impulse. A ring-out clears charge, freezes the car at the rim, and shows a flash, fade, impact ring and OUT marker before respawn. The host shows a timer and live standings. Physics lives in `web/sim.js`.

## Run and verify

From the checkout, use Node 22+, `npm ci`, `npm start` and `npm test`. The default port is 3000. The last verified preview ran on port **3022** at [this temporary HTTPS lobby](https://reviews-runtime-surgery-signs.trycloudflare.com/). This address was verified on November 16. Refresh the host and phones to pick up browser changes through the same running tunnel. A new Quick Tunnel prints a new address in its terminal. Check the lobby and multiplayer connection before sharing. For a replacement tunnel to a running server on 3022:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3022
```

`server.js` owns rooms, relays Socket.IO events and explicitly lists public asset routes. Browser files are read from disk, but server-side changes require restarting the process behind the demo tunnel. Restarting expires existing rooms. Refresh host and phones after client changes. Use trusted HTTPS to test physical motion.

The latest focused run passed all 3 Pogo, 4 tennis, 4 bumper-car and 3 motion tests. The lobby integration test passed separately outside the sandbox. Recheck the current working branch before publishing new changes.
