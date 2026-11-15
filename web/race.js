const canvas = el('arena');
const ctx = canvas.getContext('2d');
let match, state, animation, countdown, inputs, stickPointer;
let axis = { x: 0, y: 0 };
const ownsSim = () => match?.driver === socket.id;
const myCar = () => match?.players.find(p => p.id === playerId);

const tennis = () => match?.game === 'Table Tennis';
const pogo = () => match?.game === 'Pogo Race';
const simulation = () => pogo() ? PogoSim : tennis() ? TennisSim : BumperSim;
el('startPogo').onclick = () => start('Pogo Race');
function stroke(swing, lane = Number(el('lane').value)) {
  if (socket.connected && tennis() && myCar() && match.phase === 'playing')
    socket.emit('input', { id: match.id, lane, swing });
}
el('lane').onchange = () => stroke(false);
el('swing').onclick = () => stroke(true);
el('start').onclick = () => start('Bumper Cars');
el('startTennis').onclick = () => start('Table Tennis');
async function start(game) {
  try {
    const result = await socket.timeout(4000).emitWithAck('start', game);
    if (result.error) status(result.error);
  } catch { status('Could not start. Check the connection and retry.'); }
};
el('back').onclick = () => socket.emit('lobby');
function send(boost = false) {
  if (socket.connected && match?.game === 'Bumper Cars' && match.phase === 'playing' && myCar())
    socket.emit('input', { id: match.id, ...axis, boost });
}
function steer(event) {
  if (stickPointer !== event.pointerId) return;
  const rect = el('stick').getBoundingClientRect();
  const travel = (rect.width - el('thumb').offsetWidth) / 2;
  if (travel <= 0) return;
  const x = (event.clientX - rect.left - rect.width / 2) / travel;
  const y = (event.clientY - rect.top - rect.height / 2) / travel;
  const scale = Math.max(1, Math.hypot(x, y));
  axis = { x: x / scale, y: y / scale };
  el('thumb').style.transform = `translate(${axis.x * travel}px, ${axis.y * travel}px)`;
  send();
}
function release() {
  stickPointer = undefined;
  el('thumb').style.transform = '';
  axis = { x: 0, y: 0 };
  send();
}
el('stick').onpointerdown = event => {
  if (stickPointer !== undefined) return;
  stickPointer = event.pointerId;
  el('stick').setPointerCapture(event.pointerId);
  steer(event);
};
el('stick').onpointermove = steer;
el('stick').onlostpointercapture = release;
el('boost').onpointerdown = () => send(true);
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });

const playerFigures = new Image();
playerFigures.src = '/figures.png';
const bumperCars = new Image();
bumperCars.src = '/bumper-cars.png';
const pogoRiders = new Image();
pogoRiders.src = '/pogo-riders.png';
const playerColors = ['#a5c977', '#96b9ed', '#ed9a8e', '#be9ad9'];
let trampoline;
let standingsKey;

function paintTrampoline() {
  const surface = document.createElement('canvas');
  surface.width = canvas.width;
  surface.height = canvas.height;
  const g = surface.getContext('2d');
  function oval(y, rx, ry, fill) {
    g.beginPath();
    g.ellipse(380, y, rx, ry, 0, 0, 2 * Math.PI);
    g.fillStyle = fill;
    g.fill();
  }
  g.translate(0, -14);
  g.lineWidth = 9;
  g.lineCap = 'round';
  for (const angle of [0.16, 0.82, 1.57, 2.32, 2.98]) {
    const x = 380 + 350 * Math.cos(angle);
    const y = 250 + 213 * Math.sin(angle);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 5 * Math.cos(angle), y + 44);
    g.strokeStyle = '#667d74';
    g.stroke();
  }
  oval(256, 358, 222, '#58746a');
  oval(250, 358, 222, '#9fb9a9');
  oval(250, 348, 216, '#415b54');
  for (let i = 0; i < 88; i++) {
    const angle = i * Math.PI / 44;
    g.beginPath();
    g.moveTo(380 + 334 * Math.cos(angle), 250 + 206 * Math.sin(angle));
    g.lineTo(380 + 348 * Math.cos(angle + .009), 250 + 216 * Math.sin(angle + .009));
    g.lineWidth = 2.5;
    g.strokeStyle = '#d3d8c9';
    g.stroke();
  }
  oval(250, 335, 207, '#37544e');
  return surface;
}

function drawFigure(context, slot, x, feet, size) {
  if (!playerFigures.complete || !playerFigures.naturalWidth) return;
  const w = playerFigures.naturalWidth / 2, h = playerFigures.naturalHeight / 2;
  context.drawImage(playerFigures, (slot % 2) * w, Math.floor(slot / 2) * h, w, h,
    x - size / 2, feet - size, size, size);
}

function draw() {
  trampoline ??= paintTrampoline();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(trampoline, 0, 0);
  for (const c of [...state.cars].sort((a,b) => a.y - b.y)) {
    if (c.out && c.out < 100) continue;
    ctx.save();
    ctx.translate(380 + c.x * 3.35, 236 + c.y * 2.07 + (c.out ? (120 - c.out) * 2 : 0));
    ctx.globalAlpha = c.shield && state.tick % 12 < 6 ? 0.55 : 1;
    ctx.fillStyle = '#29423c';
    ctx.beginPath(); ctx.ellipse(0, 2, 25, 14, 0, 0, Math.PI * 2); ctx.fill();
    if (c.charge === 3 || c.power) {
      ctx.beginPath(); ctx.ellipse(0, 1, 29, 16, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe7a3'; ctx.lineWidth = 4; ctx.stroke();
    }
    if (bumperCars.complete && bumperCars.naturalWidth) {
      // Columns start at east and turn clockwise in screen coordinates.
      const direction = (Math.round(Math.atan2(c.dy, c.dx) / (Math.PI / 4)) + 8) % 8;
      ctx.drawImage(bumperCars, direction * 128, c.slot * 128, 128, 128, -32, -49, 64, 64);
    } else {
      drawFigure(ctx, c.slot, 0, 5, 60);
    }
    ctx.restore();
  }
}

function updateStandings(players, metric = 'score', unit = '') {
  const sorted = [...players].sort((a,b) => b[metric] - a[metric] || a.slot - b.slot);
  const key = sorted.map(c => c.slot + '/' + c[metric]).join(',');
  if (key === standingsKey) return;
  standingsKey = key;
  const board = el('standings');
  const tops = new Map(Array.from(board.children, row => [row.className, row.getBoundingClientRect().top]));
  board.replaceChildren(...sorted.map(car => {
    const row = document.createElement('li');
    row.className = 'slot-' + car.slot;
    const rank = document.createElement('small');
    rank.textContent = ['1st', '2nd', '3rd', '4th'][sorted.findIndex(c => c[metric] === car[metric])];
    const icon = document.createElement('span');
    icon.className = 'figure';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = car.name;
    const points = document.createElement('strong');
    points.textContent = car[metric] + unit;
    row.append(rank, icon, name, points);
    return row;
  }));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const row of board.children) {
      const delta = tops.get(row.className) - row.getBoundingClientRect().top;
      if (delta) row.animate([{ transform: 'translateY(' + delta + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
    }
  }
}

function display() {
  if (pogo()) {
    if (host) {
      drawTrack(ctx, state, playerColors);
      updateStandings(state.riders, 'distance', ' m');
      el('clockLabel').textContent = countdown ? 'Starting in' : state.phase === 'charge' ? 'Next jump' : 'Race';
      el('roundClock').textContent = countdown ? Math.ceil(countdown / 1000)
        : state.phase === 'finished' ? 'Finish' : state.phase === 'air' ? 'Jump!' : ((PogoSim.chargeTicks - state.age) / 60).toFixed(1) + ' s';
    }
    const rider = state.riders.find(r => r.id === playerId);
    el('raceInfo').textContent = host || state.phase === 'finished' ? '' : !rider ? 'Waiting for next race' :
      countdown > 0 ? 'Starting in ' + Math.ceil(countdown / 1000) :
      state.phase === 'charge' ? 'Pump! Jump in ' + ((PogoSim.chargeTicks - state.age) / 60).toFixed(1) + ' s' : 'Jump!';
    el('scores').textContent = rider ? 'Charge ' + rider.charge + ' / ' + PogoSim.cap : '';
    el('notice').textContent = '';
    return;
  }
  if (tennis()) {
    if (host) {
      drawCourt(ctx, state);
      updateStandings(state.players);
      el('clockLabel').textContent = countdown ? 'Starting in' : 'First to 7';
      el('roundClock').textContent = countdown ? Math.ceil(countdown / 1000) : state.players.map(p => p.score).join('–');
    }
    el('raceInfo').textContent = state.winner !== null ? '' : !host && !myCar() ? 'Waiting for next round' :
      countdown > 0 ? 'Starting in ' + Math.ceil(countdown / 1000) :
      state.pause ? state.players[state.hitter].name + ' serves' : 'Swing when the ball reaches your end';
    el('scores').textContent = '';
    el('notice').textContent = state.notice;
    return;
  }
  const car = myCar();
  const own = state.cars.find(c => c.slot === car?.slot);
  if (host) {
    draw();
    updateStandings(state.cars);
    const seconds = Math.ceil((3600 - state.tick) / 60);
    el('clockLabel').textContent = countdown > 0 ? 'Starting in' : 'Time left';
    el('roundClock').textContent = countdown > 0 ? Math.ceil(countdown / 1000)
      : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }
  el('raceInfo').textContent = !host && !car ? 'Waiting for next round' : '';
  if (own) {
    el('boost').classList.toggle('cooling', Boolean(own.cooldown));
    el('boost').textContent = own.cooldown ? Math.ceil(own.cooldown / 60) + ' s'
      : own.charge === 3 ? 'Super boost' : 'Boost';
  }
  el('scores').textContent = '';
  el('notice').textContent = state.notice;
}
function run() {
  const sim = simulation();
  const finished = () => pogo() ? state.phase === 'finished' : tennis() ? state.winner !== null : state.tick === 3600;
  let previous = performance.now(), debt = 0, published = -100;
  function frame(now) {
    const elapsed = now - previous;
    previous = now;
    if (countdown > 0) countdown = Math.max(0, countdown - elapsed);
    else debt += Math.min(elapsed, 250);
    while (debt >= 1000 / 60 && !finished()) {
      sim.step(state, inputs);
      Object.values(inputs).forEach(input => { input.boost = false; input.swing = false; input.pump = false; });
      debt -= 1000 / 60;
    }
    if (now - published >= 100 || finished()) {
      socket.emit('frame', { id: match.id, state, countdown });
      published = now;
    }
    display();
    if (!finished()) animation = requestAnimationFrame(frame);
  }
  animation = requestAnimationFrame(frame);
}
function show(next) {
  cancelAnimationFrame(animation);
  match = next;
  document.body.classList.toggle('in-match', Boolean(match));
  inputs = {};
  release();
  const playing = match?.phase === 'playing';
  const bumper = match?.game === 'Bumper Cars';
  standingsKey = undefined;
  document.body.classList.toggle('bumper-pad', Boolean(bumper && playing && !host && myCar()));
  document.body.classList.toggle('game-host', Boolean(match && host));
  document.body.classList.toggle('motion-pad', Boolean(!host && !bumper && playing && myCar()));
  el('gameHud').hidden = !match || !host;
  el('race').hidden = !match;
  el('arena').hidden = !host;
  el('controls').hidden = tennis() || pogo() || !playing || !myCar();
  el('pumpPad').hidden = !pogo() || !playing || !myCar();
  if (el('pumpPad').hidden) stopPumpMotion();
  el('motionSetup').hidden = !playerId || !socket.connected || (match && !(tennis() && playing && myCar()));
  refreshPaddle();
  el('lane').value = '0';
  el('gameTitle').textContent = match?.game || '';
  el('back').hidden = !host || !match || playing;
  el('start').textContent = match ? 'Rematch' : 'Start Bumper Cars';
  el('startTennis').textContent = match ? 'Rematch' : 'Start Table Tennis';
  el('startPogo').textContent = match ? 'Rematch' : 'Start Pogo Race';
  el('roster').style.display = match ? 'none' : '';
  el('invite').style.display = match ? 'none' : '';
  el('start').style.display = playing || tennis() || pogo() ? 'none' : '';
  el('startPogo').style.display = playing || (match && !pogo()) ? 'none' : '';
  el('startTennis').style.display = playing || (match && !tennis()) ? 'none' : '';
  if (!match) return;
  if (tennis() && playing && paddleMotion.active) stroke(false, paddleMotion.lane);
  countdown = playing ? 3000 : 0;
  state = match.result || simulation().create(match.players);
  display();
  if (playing && ownsSim()) run();
  if (!playing && !host) {
    if (pogo()) {
      const names = state.riders.filter(r => state.winners.includes(r.slot)).map(r => r.name);
      el('raceInfo').textContent = (names.length > 1 ? 'Shared win · ' : 'Winner · ') + names.join(', ');
      return;
    }
    if (tennis()) {
      el('raceInfo').textContent = state.players[state.winner].name + ' wins';
      return;
    }
  }
}
socket.on('drive', data => {
  if (ownsSim()) inputs[data.slot] = { ...data,
    boost: countdown === 0 && !data.reset && (data.boost || inputs[data.slot]?.boost) };
});
socket.on('stroke', data => {
  if (!ownsSim() || match.id !== data.id || !tennis()) return;
  const prev = inputs[data.slot];
  const pressed = data.swing && countdown === 0;
  inputs[data.slot] = { lane: data.lane, swing: pressed || prev?.swing,
    shotLane: pressed ? data.lane : prev?.shotLane };
});
socket.on('frame', frame => {
  if (match?.id !== frame.id) return;
  state = frame.state; countdown = frame.countdown; display();
});
socket.on('match', show);
socket.on('disconnect', () => show(null));
