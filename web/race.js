const colors = ['#2779bd', '#e18126', '#19876c', '#af4483'];
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
  const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
  const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
  const scale = Math.max(1, Math.hypot(x, y));
  axis = { x: x / scale, y: y / scale };
  send();
}
function release() {
  stickPointer = undefined;
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

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const [y, color] of [[264, '#35455a'], [250, '#dfebf1']]) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(380, y, 335, 207, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const c of [...state.cars].sort((a,b) => a.y - b.y)) {
    if (c.out && c.out < 100) continue;
    ctx.save();
    ctx.translate(380 + c.x * 3.35, 250 + c.y * 2.07 + (c.out ? (120 - c.out) * 2 : 0));
    ctx.globalAlpha = c.shield && state.tick % 12 < 6 ? 0.5 : 1;
    ctx.fillStyle = colors[c.slot];
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = c.charge === 3 ? 5 : 2;
    ctx.strokeStyle = c.charge === 3 ? '#ffbf00' : '#172c39'; ctx.stroke();
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 17px sans-serif';
    ctx.fillText(String(c.slot + 1), 0, 6);
    ctx.restore();
  }
}
function display() {
  if (pogo()) {
    if (host) drawTrack(ctx, state, colors);
    const rider = state.riders.find(r => r.id === playerId);
    el('raceInfo').textContent = !host && !rider ? 'Waiting for next race' :
      countdown > 0 ? 'Starting in ' + Math.ceil(countdown / 1000) :
      state.phase === 'charge' ? 'Pump! Jump in ' + ((PogoSim.chargeTicks - state.age) / 60).toFixed(1) + ' s' : 'Jump!';
    el('scores').textContent = rider ? 'Charge ' + rider.charge + ' / ' + PogoSim.cap : '';
    el('notice').textContent = '';
    return;
  }
  if (tennis()) {
    if (host) drawCourt(ctx, state);
    el('raceInfo').textContent = !host && !myCar() ? 'Waiting for next round' :
      countdown > 0 ? 'Starting in ' + Math.ceil(countdown / 1000) :
      state.pause ? state.players[state.hitter].name + ' serves' : 'Swing when the ball reaches your end';
    el('scores').textContent = state.players.map(p => p.name + ' · ' + p.score).join(' | ');
    el('notice').textContent = state.notice;
    return;
  }
  const car = myCar();
  const own = state.cars.find(c => c.slot === car?.slot);
  el('raceInfo').textContent = countdown > 0 ? 'Starting in ' + Math.ceil(countdown / 1000)
    : Math.ceil((3600 - state.tick) / 60) + ' seconds';
  if (host) draw();
  if (!host && !car) el('raceInfo').textContent = 'Waiting for next round';
  if (own) {
    el('raceInfo').textContent += ' · Car ' + (own.slot + 1) + ' · ' + own.name;
    el('boost').textContent = own.cooldown ? 'Boost in ' + Math.ceil(own.cooldown / 60)
      : own.charge === 3 ? 'Powered boost' : 'Boost';
  }
  el('scores').textContent = host ? state.cars.map(c => '#' + (c.slot + 1) + ' ' + c.name + ' · ' + c.score).join('   |   ') : '';
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
  inputs = {};
  release();
  const playing = match?.phase === 'playing';
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
  if (!playing) {
    if (pogo()) {
      const names = state.riders.filter(r => state.winners.includes(r.slot)).map(r => r.name);
      el('raceInfo').textContent = (names.length > 1 ? 'Shared win · ' : 'Winner · ') + names.join(', ');
      return;
    }
    if (tennis()) {
      el('raceInfo').textContent = state.players[state.winner].name + ' wins';
      return;
    }
    const best = Math.max(...state.cars.map(c => c.score));
    const winners = state.cars.filter(c => c.score === best).map(c => c.name);
    el('raceInfo').textContent = (winners.length > 1 ? 'Shared win · ' : 'Winner · ') + winners.join(', ') + ' · ' + best + ' points';
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
