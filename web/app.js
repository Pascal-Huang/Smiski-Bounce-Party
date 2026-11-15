const el = id => document.getElementById(id);
const [, route, rawCode] = location.pathname.split('/');
const code = rawCode?.toUpperCase();
const host = route === 'play';
const storage = host ? sessionStorage : localStorage;
const key = 'bounceback/' + route + '/' + code;
const socket = io();
history.scrollRestoration = 'manual';
function scrollToTop() { window.scrollTo(0, 0); }
window.addEventListener('pageshow', scrollToTop);
let entering = false;
let playerId;
let mySlot;

function status(message, retry = false) {
  el('status').textContent = message;
  el('retry').hidden = !retry;
}

el('home').hidden = Boolean(code);
el('room').hidden = !code;
el('heading').hidden = host;
el('heading').textContent = 'Room ' + (code || '');
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
    scrollToTop();
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
      status('');
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
function renderPillars(stage, players, preview = false) {
  const previous = new Map(Array.from(stage.children, node => [node.dataset.slot, node.getBoundingClientRect()]));
  stage.replaceChildren(...players.map((player, index) => {
    const slot = player.slot;
    const pillar = document.createElement(preview ? 'div' : 'li');
    pillar.className = 'pillar slot-' + slot;
    pillar.dataset.slot = slot;
    pillar.classList.toggle('local-player', !host && !preview && slot === mySlot);
    if (players.length === 4) {
      const [center, bottom] = [[50, 49], [23, 25], [77, 25], [50, 2]][index];
      pillar.style.left = (center - 20) + '%';
      pillar.style.bottom = bottom + '%';
    } else if (!preview) {
      const backRow = players.length > 2 && index < players.length - 2;
      const rowCount = backRow ? players.length - 2 : Math.min(2, players.length);
      const column = !backRow && players.length > 2 ? index - (players.length - 2) : index;
      pillar.style.left = ((column + 0.5) / rowCount * 100 - 20) + '%';
      pillar.style.bottom = players.length <= 2 ? '24%' : backRow ? '51%' : '5%';
    }
    const base = document.createElement('div');
    base.className = 'plinth';
    pillar.append(base);
    {
      const sprite = document.createElement('span');
      sprite.className = 'figure';
      base.append(sprite);
      if (!preview && !player.connected) pillar.classList.add('away');
    }
    if (!preview) {
      const name = document.createElement('strong');
      name.textContent = player.name;
      const state = document.createElement('small');
      state.textContent = !player.connected
        ? 'Reconnecting' : slot === mySlot ? 'You' : 'Connected';
      pillar.append(name, state);
    }
    return pillar;
  }));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const node of stage.children) {
    const before = previous.get(node.dataset.slot);
    if (!before) continue;
    const after = node.getBoundingClientRect();
    const dx = before.left - after.left, dy = before.top - after.top;
    if (dx || dy) node.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
  }
}
if (!code) renderPillars(el('preview'), Array.from({ length: 4 }, (_, slot) => ({ slot })), true);

let connectedPlayers = [];
socket.on('roster', ({ players, count, games }) => {
  connectedPlayers = players.filter(p => p.connected);
  if (el('tennisPicker').open) renderTennisChoices();
  el('roster').hidden = false;
  el('count').textContent = count + ' / 4 connected';
  renderPillars(el('players'), players);
  const buttons = ['start', 'startTennis', 'startPogo'];
  games.forEach((game, index) => {
    const button = el(buttons[index]);
    button.hidden = !host;
    button.disabled = !game.eligible || !game.implemented;
    button.dataset.rule = game.name === 'Table Tennis' ? 'Choose 2 players' : '2–4 players';
  });
});
