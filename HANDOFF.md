# Bounceback handoff

## Resume here: Pogo Race

Continue in the existing checkout at `C:\Users\pashu\Hack Club Haven\hackhaven`. The owner wants to work on **Pogo Race next**. The specific change is still open. Read this file before starting a new task, then consult `AGENTS.md` for repository guidance and `README.md` for setup and controls.

At handoff, local `main` was at `f4a0159`. The latest lobby, calibration, tennis timing and results changes are in the working tree. Use `git status --short` and preserve those edits. The original planning document is at `C:\Users\pashu\Downloads\Official Bounce back prd.md`.

## Pogo Race today

Two to four phones can pump by tapping **Pump** or by enabling motion and moving the phone up and down. All riders charge and jump together. Each cycle has 1.9 seconds to charge and 0.5 seconds in the air. Each jump travels 4 m plus 2 m per accepted pump. Seven pumps fill the meter and add a 5 m burst, for a maximum jump of 23 m. Distances and standings update together on landing. Once a rider reaches 350 m, the greatest landed distance wins; equal leaders share the win.

- `web/pogo.js` contains the simulation, motion detector, six rider poses and track renderer. The sprite sheet is `web/pogo-riders.png`.
- `web/pump.js` handles phone input and motion permission. Inputs carry a round number so a delayed pump cannot charge the next jump.
- `web/race.js` connects the simulation to the host canvas, standings, countdown and winner card. The track renderer records each rider’s drawn position and pose for the transition into the winner card.
- Run `node --test test/pogo.test.js` for charge limits, simultaneous landings, ties and motion detection.

## Shared game flow

The laptop hosts a room. Two to four phones join by QR or four-letter code. Each player keeps their nickname, shape and slot color (green, blue, coral red or purple) through reconnects. Use matte ivory, dusty teal, sand and warm gray for scenery.

All three games show a large 3–2–1 countdown on the host and phones. At the finish, the winner’s sprite moves into a card while the playfield remains visible through an ivory backdrop. The card pops with confetti, then moves left as final standings enter from the right. Narrow screens stack the card above standings. Ties show all winners. Reduced-motion mode presents the settled result. The host can rematch or return to the lobby.

## Other games

**Table Tennis.** Exactly two players compete, first to seven. With three or four phones connected, the host chooses the pair. The host presses **Start calibration** once for both paddles. Players hold phones edge-on and follow arrows through two rounds of left, right and forward strokes. A missed verification retries that direction. Each player gets a green check on completion; both must finish before the countdown. A phone may need a local tap to grant browser motion permission. Tennis uses motion only.

The host shows two brown tables with a divider. Timing feedback uses words: Very early / Very late in red, Early / Late in amber, Perfect in gold. Three Perfects fill a player’s three-segment meter. It stays charged across points and non-Perfect returns. The next Perfect fires a pink **Supersmash** and empties the meter. Tennis rules live in `web/tennis.js`, rendering in `web/court.js`, and calibration in `web/motion.js`.

**Bumper Cars.** Phones have a joystick and Boost button. Directional cars battle on a trampoline; a credited ring-out earns one point. The host shows a timer and live standings. Physics lives in `web/sim.js`.

## Run and verify

From the checkout, use Node 22+, `npm ci`, `npm start` and `npm test`. The default port is 3000. The last public demo used **3003** and this [temporary HTTPS lobby](https://speaks-changes-led-approximate.trycloudflare.com). Check the link before sharing it again. For a replacement tunnel to a running server on 3003:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3003
```

`server.js` owns rooms, relays Socket.IO events and explicitly lists public asset routes. Browser files are read from disk, but server-side changes require restarting the process behind the demo tunnel. Restarting expires existing rooms. Refresh host and phones after client changes. Use trusted HTTPS to test physical motion.

At the last feature check, all 15 automated tests passed. The public demo was tested with four simulated phones: selecting slots 2 and 4 sent only those players into tennis calibration. Physical two-phone testing of swing consistency, timing feel and the results transition is still pending.
