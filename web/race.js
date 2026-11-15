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
function stroke(swing, lane = paddleMotion.lane) {
  if (socket.connected && tennis() && myCar() && match.phase === 'playing')
    socket.emit('input', { id: match.id, lane, swing });
}
el('start').onclick = () => start('Bumper Cars');
el('startTennis').onclick = () => start('Table Tennis');
function chosenSlots() {
  return Array.from(el('tennisChoices').querySelectorAll(':checked'), input => Number(input.value));
}
function updatePair() {
  const full = chosenSlots().length === 2;
  el('confirmPair').disabled = !full;
  for (const input of el('tennisChoices').querySelectorAll('input')) input.disabled = full && !input.checked;
}
function renderTennisChoices() {
  const selected = chosenSlots();
  el('tennisChoices').replaceChildren(...connectedPlayers.map(p => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = p.slot;
    input.checked = selected.includes(p.slot);
    label.append(input, ' ' + p.name);
    return label;
  }));
  updatePair();
}
el('tennisChoices').onchange = updatePair;
el('cancelPair').onclick = () => el('tennisPicker').close();
el('confirmPair').onclick = () => start('Table Tennis', chosenSlots());
async function start(game, slots) {
  const picker = el('tennisPicker');
  if (game === 'Table Tennis' && connectedPlayers.length > 2 && !slots) {
    el('tennisChoices').replaceChildren();
    el('pickerError').textContent = '';
    renderTennisChoices();
    picker.showModal();
    return;
  }
  try {
    const result = await socket.timeout(4000).emitWithAck('start', slots ? { game, slots } : game);
    if (result.error) throw new Error(result.error);
    if (picker.open) picker.close();
  } catch (error) {
    if (picker.open) el('pickerError').textContent = error.message;
    else status(error.message);
  }
};
document.querySelector('.brand a').onclick = event => {
  if (!match) return;
  event.preventDefault();
  if (host) socket.emit('lobby');
  else show(null);
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

function boostFill(car) {
  if (car.power) return 1;
  const remaining = Math.max(0, 1 - (state.tick - (car.chargeTick ?? -60)) / 16);
  return Math.max(0, car.charge - remaining) / BumperSim.boostCapacity;
}

function draw() {
  trampoline ??= paintTrampoline();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(trampoline, 0, 0);
  for (const c of [...state.cars].sort((a,b) => a.y - b.y)) {
    if (c.out && c.out <= 45) continue;
    ctx.save();
    ctx.translate(380 + c.x * 3.35, 236 + c.y * 2.07);
    ctx.globalAlpha = c.shield && state.tick % 12 < 6 ? 0.55 : 1;
    if (c.out) {
      const elapsed = 120 - c.out;
      ctx.globalAlpha = elapsed < 30 ? 0.6 + 0.4 * Math.cos(elapsed * Math.PI / 5)
        : (c.out - 45) / 45;
    }
    ctx.fillStyle = '#29423c';
    ctx.beginPath(); ctx.ellipse(0, 2, 25, 14, 0, 0, Math.PI * 2); ctx.fill();
    if (!c.out) {
      const fill = boostFill(c) * BumperSim.boostCapacity;
      const segment = 2 * Math.PI / BumperSim.boostCapacity;
      ctx.lineWidth = 6;
      for (let i = 0; i < BumperSim.boostCapacity; i++) {
        const start = -Math.PI / 2 + segment * i + 0.05;
        const sweep = segment - 0.10;
        ctx.beginPath(); ctx.ellipse(0, 1, 39, 24, 0, start, start + sweep);
        ctx.strokeStyle = '#243b32'; ctx.stroke();
        if (fill <= i) continue;
        ctx.beginPath(); ctx.ellipse(0, 1, 39, 24, 0, start, start + sweep * Math.min(1, fill - i));
        ctx.strokeStyle = fill >= BumperSim.boostCapacity ? '#bc267f' : '#ffe7a3'; ctx.stroke();
      }
    }
    if (bumperCars.complete && bumperCars.naturalWidth) {
      // Columns start at east and turn clockwise in screen coordinates.
      const direction = (Math.round(Math.atan2(c.dy, c.dx) / (Math.PI / 4)) + 8) % 8;
      rememberSprite(c.slot, bumperCars, direction, 128, 380 + c.x * 3.35,
        219 + c.y * 2.07, 64);
      ctx.drawImage(bumperCars, direction * 128, c.slot * 128, 128, 128, -32, -49, 64, 64);
    } else {
      drawFigure(ctx, c.slot, 0, 5, 60);
    }
    ctx.restore();
  }
  for (const car of state.cars) {
    if (!car.out) continue;
    const elapsed = 120 - car.out;
    const x = 380 + car.x * 3.35, y = 236 + car.y * 2.07;
    ctx.save();
    if (elapsed < 36) {
      ctx.globalAlpha = 1 - elapsed / 36;
      ctx.strokeStyle = '#ffb191'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(x, y, 24 + elapsed, 14 + elapsed * 0.6, 0, 0, 2 * Math.PI); ctx.stroke();
    }
    ctx.globalAlpha = Math.min(1, car.out / 15);
    const labelY = y < 72 ? y + 35 : y - 65;
    ctx.fillStyle = '#743b32';
    ctx.beginPath(); ctx.roundRect(x - 24, labelY, 48, 23, 7); ctx.fill();
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff8eb'; ctx.fillText('OUT', x, labelY + 17);
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
  renderStandings(board, sorted, metric, unit);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const row of board.children) {
      const delta = tops.get(row.className) - row.getBoundingClientRect().top;
      if (delta) row.animate([{ transform: 'translateY(' + delta + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
    }
  }
}

function renderStandings(board, sorted, metric, unit) {
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
}

function display() {
  const count = el('startCount');
  const digit = countdown > 0 ? String(Math.ceil(countdown / 1000)) : '';
  count.hidden = !digit;
  if (count.textContent !== digit) count.textContent = digit;
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
    el('raceInfo').textContent = !host && !myCar() && state.winner === null ? 'Waiting for next round' : '';
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
    const fill = boostFill(own);
    el('boost').style.setProperty('--boost-angle', fill * 360 + 'deg');
    el('boost').style.setProperty('--boost-color', fill >= 1 ? '#bc267f' : '#ffe7a3');
    el('boost').disabled = Boolean(own.out);
    el('boost').classList.toggle('cooling', Boolean(own.cooldown));
    el('boost').textContent = own.out ? 'Out' : own.cooldown ? Math.ceil(own.cooldown / 60) + ' s'
      : own.charge >= BumperSim.boostCapacity ? 'Super boost' : 'Boost';
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
const winnerSprites = new Map();
function rememberSprite(slot, sheet, frame, cell, x, y, size, flipped = false) {
  winnerSprites.set(slot, { sheet, frame, cell, x, y, size, flipped });
}
function showVictory() {
  const players = tennis() ? state.players : pogo() ? state.riders : state.cars;
  const best = pogo() ? 0 : Math.max(...players.map(p => p.score));
  const winners = tennis() ? [players[state.winner]] : players.filter(p =>
    pogo() ? state.winners.includes(p.slot) : p.score === best);
  el('victoryTitle').textContent = winners.map(p => p.name).join(' & ') +
    (winners.length === 1 ? ' wins!' : ' share the win!');
  el('victoryScore').textContent = tennis() ? winners[0].score + '–' + players[1 - state.winner].score
    : pogo() ? winners[0].distance + ' m' : best + (best === 1 ? ' ring-out' : ' ring-outs');
  el('victoryActions').hidden = !host;
  const metric = pogo() ? 'distance' : 'score';
  const sorted = [...players].sort((a,b) => b[metric] - a[metric] || a.slot - b.slot);
  renderStandings(el('finalStandings'), sorted, metric, pogo() ? ' m' : '');
  const portraits = el('victoryPortraits');
  portraits.replaceChildren();
  el('victory').showModal();
  const field = canvas.getBoundingClientRect();
  for (const p of winners) {
    const badge = document.createElement('div');
    badge.style.backgroundColor = playerColors[p.slot];
    const portrait = document.createElement('canvas');
    portrait.width = portrait.height = 192;
    const g = portrait.getContext('2d');
    const sprite = host && winnerSprites.get(p.slot);
    if (sprite) {
      if (sprite.flipped) { g.translate(192, 0); g.scale(-1, 1); }
      g.drawImage(sprite.sheet, sprite.frame * sprite.cell, p.slot * sprite.cell, sprite.cell, sprite.cell, 0, 0, 192, 192);
    } else drawFigure(g, p.slot, 96, 192, 192);
    badge.append(portrait);
    portraits.append(badge);
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const confetti = el('victoryConfetti');
  confetti.replaceChildren();
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('i');
    const angle = Math.PI * 2 * i / 28;
    const radius = 85 + Math.random() * 55;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    piece.style.backgroundColor = playerColors[i % playerColors.length];
    confetti.append(piece);
    piece.animate([
      { transform: 'scale(0)', opacity: 0 },
      { transform: `translate(${x * .7}px,${y * .7}px) rotate(80deg)`, opacity: 1, offset: .3 },
      { transform: `translate(${x}px,${y + 36}px) rotate(220deg)`, opacity: 0 }
    ], { delay: 1100, duration: 630, fill: 'both' });
  }
  winners.forEach((p, i) => {
    const sprite = host && winnerSprites.get(p.slot);
    if (!sprite) return;
    const portrait = portraits.children[i].firstChild;
    const rect = portrait.getBoundingClientRect();
    const dx = field.left + sprite.x * field.width / canvas.width - rect.left - rect.width / 2;
    const dy = field.top + sprite.y * field.height / canvas.height - rect.top - rect.height / 2;
    const scale = sprite.size * field.width / canvas.width / rect.width;
    portrait.animate([{ transform: `translate(${dx}px,${dy}px) scale(${scale})` }, { transform: 'none' }],
      { delay: 200, duration: 900, easing: 'cubic-bezier(.22,.75,.25,1)', fill: 'backwards' });
  });
}
el('victoryRematch').onclick = () => start(match.game);
el('victoryLobby').onclick = () => socket.emit('lobby');
el('cancelSetup').onclick = () => socket.emit('lobby');
el('startCalibration').onclick = () => socket.emit('startCalibration', match.id);
function renderCalibration() {
  const own = myCar();
  const remotes = own ? [own] : match.players;
  el('remoteSteps').replaceChildren(...remotes.map(p => {
    const panel = document.createElement('article');
    panel.style.borderColor = playerColors[p.slot];
    const title = document.createElement('h3');
    title.textContent = p.name;
    panel.append(title);
    const instruction = document.createElement('p');
    if (p.step === 7) {
      const check = document.createElement('div');
      check.className = 'stroke-arrow calibration-check';
      check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true');
      panel.append(check);
      instruction.textContent = match.players.every(p => p.step === 7)
        ? 'Complete · Starting game…' : 'Complete · Waiting for the other paddle';
    }
    else if (!p.step) instruction.textContent = match.calibrationStarted ? 'Waiting for phone motion access…' :
      'Face the host screen and hold your phone edge-on. The host starts both paddles together.';
    else {
      const gesture = strokes[(p.step - 1) % strokes.length];
      const arrow = document.createElement('div');
      arrow.className = 'stroke-arrow';
      arrow.textContent = gesture.arrow;
      arrow.setAttribute('aria-hidden', 'true');
      panel.append(arrow);
      instruction.textContent = (p.step <= 3 ? 'Round 1 · Learn' : 'Round 2 · Confirm') +
        ' · Pause, then ' + gesture.label + '.';
    }
    panel.append(instruction);
    return panel;
  }));
  el('motionSetup').hidden = !own || own.step === 7;
  el('cancelSetup').hidden = !host;
  el('startCalibration').hidden = !host || match.calibrationStarted === true;
}
function show(next) {
  if (next?.id !== match?.id || next?.phase !== match?.phase) scrollToTop();
  if (next?.id !== match?.id) winnerSprites.clear();
  if (next?.phase !== 'results' && el('victory').open) el('victory').close();
  cancelAnimationFrame(animation);
  const resetMotion = next?.id !== match?.id || next?.phase === 'results';
  const beginCalibration = next?.phase === 'calibration' && next.calibrationStarted &&
    (next.id !== match?.id || !match?.calibrationStarted);
  match = next;
  if (resetMotion) paddleSetup.stop('');
  if (beginCalibration && myCar()) paddleSetup.begin();
  const setup = match?.phase === 'calibration';
  el('calibration').hidden = !setup;
  document.body.classList.toggle('calibrating', setup);
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
  el('race').hidden = !match || setup;
  el('arena').hidden = !host;
  el('controls').hidden = tennis() || pogo() || !playing || !myCar();
  el('pumpPad').hidden = !pogo() || !playing || !myCar();
  if (el('pumpPad').hidden) stopPumpMotion();
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
  if (setup) { renderCalibration(); return; }
  if (tennis() && playing && paddleMotion.active) stroke(false, paddleMotion.lane);
  countdown = playing ? 3000 : 0;
  state = match.result || simulation().create(match.players);
  display();
  if (playing && ownsSim()) run();
  if (match.phase === 'results' && !el('victory').open) showVictory();
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
