const el = id => document.getElementById(id);
const [, route, rawCode] = location.pathname.split('/');
const code = rawCode?.toUpperCase();
const host = route === 'play';
const storage = host ? sessionStorage : localStorage;
const key = 'bounceback/' + route + '/' + code;
const socket = io();
let entering = false;
let playerId;

function status(message, retry = false) {
  el('status').textContent = message;
  el('retry').hidden = !retry;
}

el('home').hidden = Boolean(code);
el('room').hidden = !code;
el('heading').textContent = 'Room ' + code;
el('join').hidden = !code || host;
el('manual').onsubmit = event => {
  event.preventDefault();
  location.assign('/c/' + el('roomCode').value.toUpperCase());
};

el('create').onclick = async () => {
  el('create').disabled = true;
  try {
    const room = await socket.timeout(5000).emitWithAck('create');
    sessionStorage.setItem('bounceback/play/' + room.code, room.token);
    location.assign('/play/' + room.code);
  } catch {
    status('Could not create the room. Try again.');
    el('create').disabled = false;
  }
};

async function enter() {
  if (entering || !socket.connected) return;
  entering = true;
  try {
    const result = await socket.timeout(5000).emitWithAck('enter', {
      code, host, token: storage.getItem(key), nickname: el('nickname').value
    });
    if (result.error) { status(result.error, true); return; }
    playerId = result.id;
    if (host) {
      const url = new URL('/c/' + code, location.origin);
      if (['localhost', '127.0.0.1'].includes(url.hostname) && result.addresses.length) {
        url.hostname = result.addresses[0];
      }
      el('qr').src = '/qr?url=' + encodeURIComponent(url.href);
      el('address').textContent = 'Scan to join, or open ' + url.origin + ' and enter ' + code;
      el('invite').hidden = false;
      status('');
    } else {
      storage.setItem(key, result.token);
      el('motionSetup').hidden = false;
      el('join').hidden = true;
      status('Joined as ' + result.name);
    }
  } catch { status('Connection failed. Try again.', true); }
  finally { entering = false; }
}

el('join').onsubmit = event => { event.preventDefault(); enter(); };
el('retry').onclick = () => { if (!socket.connected) socket.connect(); else if (code) enter(); };
socket.on('connect', () => {
  status('');
  if (code && (host || storage.getItem(key))) enter();
});
socket.on('connect_error', () => status('Could not reach the room server.', true));
socket.on('disconnect', () => {
  el('roster').hidden = true;
  status('Reconnecting…', true);
});
function list(id, items) {
  el(id).replaceChildren(...items.map(text => {
    const li = document.createElement('li');
    li.textContent = text;
    return li;
  }));
}
socket.on('roster', ({ players, count, games }) => {
  el('roster').hidden = false;
  el('count').textContent = count + ' of 4 connected';
  el('start').hidden = !host;
  el('start').disabled = count < 2;
  el('startTennis').hidden = !host;
  el('startTennis').disabled = count !== 2;
  el('startPogo').hidden = !host;
  el('startPogo').disabled = count < 2;
  list('players', players.map(p => p.name + (p.connected ? '' : ' (Reconnecting)')));
  list('games', games.map(game => {
    const rule = game.eligible ? 'Player count OK' : game.name === 'Table Tennis'
      ? '1v1 only — requires exactly 2 players' : 'Requires 2–4 players';
    return game.name + ' · ' + rule + (game.implemented ? '' : ' · Coming soon');
  }));
});
