# Playtesting

The public game follows main. Develop and test changes on playtest before merging them into main.

Run npm run playtest locally (default port 3000). The host lobby shows Add bot player; each click fills one empty slot, up to four players total. Hover over any lobby player and select × to remove them. On touchscreens the button is always visible.

Bots stay idle in Bumper Cars and Pogo Race. Tennis bots skip calibration, wait for every real player to calibrate, and independently return each incoming shot with a 75% chance. Calibration resets preserve bot readiness. Two bots can also play tennis without phones.

For a separate Render service, select the playtest branch, use npm start, and set PLAYTEST_MODE=true. Keep this variable unset or false on the public main service. Bot creation is checked on the server and requires a host session.

Merge tested changes into main to release them. The developer controls can remain in the shared code because the public server disables them by default.
