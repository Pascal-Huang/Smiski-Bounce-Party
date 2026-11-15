# Bounceback handoff

## Resume here

Use the existing checkout at `C:\Users\pashu\Hack Club Haven\hackhaven`. The latest work integrated Table Tennis swing sprites into gameplay and served them on a fresh HTTPS lobby. No further feature has been selected. The owner is satisfied with the core mechanics and has been refining presentation and controller feel.

At handoff, HEAD was `828e9c9`. The tennis changes are in the working tree: `server.js`, `web/tennis.js`, `web/court.js`, and the untracked `web/tennis-players.png`. A fresh clone of that commit alone will lack these changes. Read `AGENTS.md` for contributor guidance and `README.md` for setup and control instructions. The planning document is at `C:\Users\pashu\Downloads\Official Bounce back prd.md`.

## What players see

- **Lobby.** The laptop hosts a room. Two to four phones join by QR or four-letter code. Each slot keeps its pillar, nickname, shape badge and original toy-like figure through reconnects. Slot colors are green, blue, coral red and purple. Use matte ivory, muted teal, sand and warm gray for scenery, Apple-style system typography, and the strongest colors on the characters.
- **Bumper Cars.** A trampoline arena with a plain mat and raised legs. Each car has eight directional views with a matching driver. Phones show a left joystick and right Boost button. The host shows a large timer above animated standings. A credited ring-out earns one point.
- **Table Tennis.** Exactly two players, split rear views, first to seven. Players hold their phones edge-on and calibrate left, right and forward strokes. A forward push aims down the middle. Touch also works. The host renders wind-up, swing and recovery for each slot color, including missed swings.
- **Pogo Race.** Two to four players pump by motion or touch. Seven pumps earn a burst. The 420 m race uses a 2.4-second jump cycle and six poses per rider. Distance standings update on landing.

## Code and assets

`server.js` owns rooms, relays Socket.IO traffic and explicitly lists public asset routes. The laptop runs the simulation. `web/app.js` handles the lobby and `web/race.js` coordinates matches, controls and standings. Bumper physics lives in `web/sim.js`. Tennis uses `web/tennis.js` for rules and swing timing, `web/court.js` for drawing, and `web/motion.js` for calibration. Pogo uses `web/pogo.js` and `web/pump.js`. Sprite sheets are in `web/`. Tennis uses six 160 px square frames per color row; left strokes mirror the lateral poses.

## Run and verify

Run `npm ci`, `npm start` and `npm test` from the checkout with Node 22+. The default port is 3000. The latest demo ran on **3003**. Its [temporary HTTPS lobby](https://speaks-changes-led-approximate.trycloudflare.com) served the updated renderer and tennis PNG at the last check. Verify the link before sharing it again.

For a replacement tunnel to a running server on port 3003, use PowerShell:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3003
```

If the page opens but sprites are missing, check `/tennis-players.png` on that exact origin. An older server returned 404 while serving the latest JavaScript. New asset routes require a current server process. Restarting a server clears its in-memory rooms.

All 13 automated tests passed after the tennis change. A separate check exercised all 12 color-and-stroke combinations through recovery. The remaining hands-on check is a two-phone match confirming that each player's physical left, right and forward strokes read clearly from their own side of the shared screen.
