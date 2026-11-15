# Bounceback

Run `npm ci` and `npm start` from this directory with Node 22 or later.
On the laptop, open the printed URL for its Wi-Fi address and select **Host a Party**.
Connect both phones to the same Wi-Fi or hotspot. Scan the QR with the first phone.
On the second, open the address printed below the QR and enter the four-letter code.
Choose a nickname or leave it blank, then tap **Join Party**.

Check that both screens show two connected players and Table Tennis accepts the count.
Add a third phone to check the 1v1 restriction. Refresh a phone to confirm it keeps
its name. Close its tab to see the slot reserved for 15 seconds after the server
detects the disconnect. Four occupied slots block further joins.

With two to four phones connected, select **Bumper Cars** on the laptop.
Hold the phone sideways, drag **Steer** with one thumb, and tap **Boost** with
the other. Knock another car off the platform to score. Five bumps into opponents
charge a powered boost, shown by a full pink ring. The round lasts 60 seconds.
Select **Rematch** to play again or **Back to lobby** to change players.
Keep the host tab visible while playing. The laptop runs the simulation, and a
host disconnect returns the room to the lobby. Late joiners wait for the next round.

Select **Table Tennis** with two to four phones connected. If more than two
are connected, the host chooses the pair. Each player watches
their own end of the table on the laptop. For motion play, join the room on
a trusted HTTPS URL. Select **Start calibration** on the host for both phones.
Grant motion access if prompted and hold the phone edge-on in your playing grip. Facing the
laptop, follow the prompts to swing left, swing right, and push forward.
Return slowly to your starting grip and pause between strokes. Repeat the
three directions to confirm them. The host shows both
players’ progress and starts the countdown when both show **Complete**.
As the ball reaches your end of the table, make a short stroke in
the direction you want the ball to travel. A forward push returns down the
centre. Gold Perfects fill the three-segment meter. Once full, the next Perfect
automatically fires a pink Supersmash and empties the meter. Charge
carries across points. Each rematch opens paddle setup again. Serve alternates
automatically each point. First to seven wins, with a rematch in the same room.
Swing timing is resolved on the host. For local HTTPS, supply a certificate
whose SAN includes the laptop's Wi-Fi IP or hostname and whose issuer both
phones trust. In PowerShell set `$env:TLS_CERT` and `$env:TLS_KEY` to the
certificate and private key file paths, then run `npm start` and open the
printed HTTPS address matching the certificate.

For **Pogo Race**, join with two to four phones. Tap **Enable pump motion** on
each HTTPS controller and move the phone up and down. Each
charge window lasts 1.9 seconds. Seven pumps fill the bar and add a distance
bonus. Riders jump together every 2.4 seconds. On the first landing across 350 m,
the farthest rider wins and equal distances share the win.

Run `npm test` for the simulation and Socket.IO integration tests. Set `REJOIN_GRACE_MS` or
`PORT` before starting to override the defaults (15000 and 3000).
Rooms live in server memory and expire when the server stops.
If phones cannot reach the address, check that the laptop allows inbound
connections on the private network and the Wi-Fi allows devices to reach each other.
