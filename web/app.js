const el = id => document.getElementById(id);
const [, route, rawCode] = location.pathname.split('/');
const code = rawCode?.toUpperCase();
const host = route === 'play';
const storage = host ? sessionStorage : localStorage;
const key = 'bounceback/' + route + '/' + code;
const socket = io();
let entering = false;
let playerId;
let mySlot;

function status(message, retry = false) {
  el('status').textContent = message;
  el('retry').hidden = !retry;
}

el('home').hidden = Boolean(code);
el('room').hidden = !code;
el('heading').textContent = host ? 'Party lobby' : 'Room ' + code;
el('inviteCode').textContent = code || '';
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
    mySlot = result.slot;
    if (host) {
      const url = new URL('/c/' + code, location.origin);
      if (['localhost', '127.0.0.1'].includes(url.hostname) && result.addresses.length) {
        url.hostname = result.addresses[0];
      }
      el('qr').src = '/qr?url=' + encodeURIComponent(url.href);
      el('address').textContent = 'Scan with your phone, or enter the code at ' + url.host;
      el('invite').hidden = false;
      status('');
    } else {
      storage.setItem(key, result.token);
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
const badges = ['●', '◆', '▲', '✦'];
function renderPillars(stage, players, preview = false) {
  stage.replaceChildren(...badges.map((badge, slot) => {
    const player = players.find(p => p.slot === slot);
    const pillar = document.createElement(preview ? 'div' : 'li');
    pillar.className = 'pillar slot-' + slot;
    const base = document.createElement('div');
    base.className = 'plinth';
    pillar.append(base);
    if (player || preview) {
      const sprite = document.createElement('span');
      sprite.className = 'figure';
      base.append(sprite);
      if (player && !player.connected) pillar.classList.add('away');
    }
    if (!preview) {
      const name = document.createElement('strong');
      const symbol = document.createElement('b');
      symbol.textContent = badge;
      symbol.setAttribute('aria-hidden', 'true');
      name.append(symbol, player?.name || 'Open spot');
      const state = document.createElement('small');
      state.textContent = !player ? 'Pillar ' + (slot + 1) : !player.connected
        ? 'Reconnecting' : slot === mySlot ? 'You' : 'Connected';
      pillar.append(name, state);
    }
    return pillar;
  }));
}
if (!code) renderPillars(el('preview'), [], true);

let connectedPlayers = [];
socket.on('roster', ({ players, count, games }) => {
  connectedPlayers = players.filter(p => p.connected);
  if (el('tennisPicker').open) renderTennisChoices();
  el('roster').hidden = false;
  el('count').textContent = count + ' / 4 connected';
  renderPillars(el('players'), players);
  el('gameHeading').hidden = !host;
  const buttons = ['start', 'startTennis', 'startPogo'];
  games.forEach((game, index) => {
    const button = el(buttons[index]);
    button.hidden = !host;
    button.disabled = !game.eligible || !game.implemented;
    button.dataset.rule = game.name === 'Table Tennis' ? 'Choose 2 players' : '2–4 players';
  });
});
