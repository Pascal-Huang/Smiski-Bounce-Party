# Repository Guidelines

## Project structure

Run commands from `hackhaven/`. `server.js` manages rooms, reconnects, QR codes and Socket.IO messages. The host and phone share `web/index.html` and `web/app.js`. Game simulations live in `web/sim.js`, `web/tennis.js` and `web/pogo.js`. Keep presentation and phone input separate from simulation rules. Register new browser assets with the static routes in `server.js`.

## Development and testing

- `npm ci` installs the locked dependencies.
- `npm start` serves the app on port 3000 by default. Use trusted HTTPS on phones when testing motion.
- `npm test` runs the Node test runner. Use `node --test test/lobby.test.js` for room changes. Name tests `test/<feature>.test.js` and describe the observable behavior.

Follow the existing two-space JavaScript indentation and camelCase function names. The project has no separate build step, configured linter or coverage threshold.

## Lobby and player identity

Polish the shared lobby and phone join screen first. Use them as the visual baseline for Bumper Cars, Table Tennis and Pogo Race.

- Use matte ivory `#F2F2E9` for the main surface, dusty teal `#AEC3C1` and sand `#EDD4B5` for scenery, and warm gray `#D1CDC7` for dividers. Keep text dark and give the QR a plain, high-contrast surround.
- Make the four player sprites the strongest colors. Assign green, blue, red and purple to slots 1–4. Draw original Smiski-inspired figures with rounded heads, tiny faces and expressive poses. Pair each color with a consistent shape and name.
- Preserve the slot identity on the host, phone, in-game HUD and results, including after reconnects. Use neutral surfaces for empty slots and label reconnecting players.
- Use `-apple-system, BlinkMacSystemFont, system-ui, sans-serif` with generous spacing. Check room codes from across the room and join controls on a narrow phone.

## Commits and pull requests

History uses short descriptive subjects. Keep changes focused, describe the player-visible effect, link related issues and list validation. Include host and phone screenshots for lobby changes.
