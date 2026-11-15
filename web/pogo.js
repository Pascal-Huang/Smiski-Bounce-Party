const PogoSim = (() => {
  const cap = 7, chargeTicks = 114, airTicks = 30, finish = 350;
  function create(players) {
    return { round: 1, phase: 'charge', age: 0, winners: [],
      riders: players.map(p => ({ ...p, distance: 0, charge: 0, jump: 0, last: -100 })) };
  }
  function step(s, inputs) {
    if (s.phase === 'finished') return;
    if (s.phase === 'charge') {
      for (const r of s.riders) {
        if (inputs[r.slot]?.pump && s.age - r.last >= 9) {
          r.charge = Math.min(cap, r.charge + 1);
          r.last = s.age;
        }
      }
      if (++s.age < chargeTicks) return;
      for (const r of s.riders) r.jump = 4 + r.charge * 2 + (r.charge === cap ? 5 : 0);
      s.phase = 'air';
      s.age = 0;
    } else if (++s.age >= airTicks) {
      for (const r of s.riders) {
        r.distance += r.jump;
        r.charge = r.jump = 0;
        r.last = -100;
      }
      const lead = Math.max(...s.riders.map(r => r.distance));
      s.age = 0;
      if (lead >= finish) {
        s.phase = 'finished';
        s.winners = s.riders.filter(r => r.distance === lead).map(r => r.slot);
      } else {
        s.round++;
        s.phase = 'charge';
      }
    }
  }
  return { create, step, cap, chargeTicks, airTicks, finish };
})();

// Project linear acceleration onto gravity so a sideways shake does not count.
function pumpDetector() {
  let first = null, last = -Infinity;
  return (vertical, now) => {
    if (!Number.isFinite(vertical) || now - last < 170) return false;
    if (first !== null && now - first > 650) first = null;
    if (first === null && vertical > 3) first = now;
    if (first === null || vertical >= -3 || now - first < 60) return false;
    first = null;
    last = now;
    return true;
  };
}

// Atlas columns: ready, compress, extend, tuck, descend, land.
function pogoFrame(state, rider) {
  if (state.phase === 'air') {
    const progress = state.age / PogoSim.airTicks;
    if (progress < 0.3) return 2;
    return progress < 0.65 ? 3 : 4;
  }
  if (state.phase === 'finished') return 5;
  if (state.age - rider.last < 6 || state.age >= PogoSim.chargeTicks - 8) return 1;
  return state.round > 1 && state.age < 7 ? 5 : 0;
}

const firstPogoLane = 190;
let courseObserver;

function alignParkCourse(surface) {
  const layout = surface.parentElement;
  function positionLanes() {
    surface.style.setProperty('--name-left', (4 - surface.getBoundingClientRect().left) + 'px');
    const artworkScale = Math.max(window.innerWidth / 1440, window.innerHeight / 900);
    const shoreline = 312 * artworkScale;
    const top = layout.getBoundingClientRect().top - document.body.getBoundingClientRect().top;
    const laneEdge = (firstPogoLane - 14) * surface.clientWidth / 760;
    layout.style.setProperty('--shore-clearance', Math.max(0, Math.ceil(shoreline + 20 - top - laneEdge)) + 'px');
  }
  positionLanes();
  courseObserver = new ResizeObserver(positionLanes);
  courseObserver.observe(surface);
  courseObserver.observe(document.querySelector('.brand'));
  window.addEventListener('resize', positionLanes);
}

function drawTrack(ctx, s, colors) {
  ctx.save();
  const progress = s.phase === 'air' ? s.age / PogoSim.airTicks : 0;
  const positions = s.riders.map(r => r.distance + r.jump * progress);
  const front = Math.max(...positions), rear = Math.min(...positions);
  // Keep space ahead of the pack and widen only as the outer riders separate.
  const scale = Math.min(10, 580 / Math.max(1, front - rear));
  const offset = Math.max(-60, (front + rear) * scale / 2 - 350);
  const screenX = meters => meters * scale - offset;
  ctx.clearRect(0, 0, 760, 500);
  const firstMark = Math.max(0, Math.ceil(offset / scale / 5) * 5);
  const finishX = screenX(PogoSim.finish);
  const laneY = index => firstPogoLane + index * 84;
  const lastLaneY = laneY(s.riders.length - 1);
  const paths = document.querySelector('.course-paths');
  if (!courseObserver) alignParkCourse(paths.parentElement);
  if (paths.childElementCount !== s.riders.length || paths.riders !== s.riders &&
      s.riders.some((r, i) => paths.children[i]?.firstChild?.textContent !== r.name)) {
    paths.replaceChildren(...s.riders.map((_, i) => {
      const lane = document.createElement('i');
      lane.style.top = (laneY(i) - 14) / 5 + '%';
      const name = document.createElement('span');
      name.className = 'pogo-rider-name';
      name.textContent = s.riders[i].name;
      lane.append(name);
      return lane;
    }));
  }
  paths.riders = s.riders;
  paths.style.setProperty('--stone-drift', (-offset % 80) / 760 * 100 + 'cqw');
  for (let i = 0; i < s.riders.length; i++) {
    const y = laneY(i);
    for (let mark = firstMark; mark < PogoSim.finish && screenX(mark) < 760; mark += 5) {
      ctx.fillStyle = '#788a70'; ctx.fillRect(Math.round(screenX(mark)), y + 16, mark % 50 === 0 ? 4 : 2, 3);
    }
  }

  for (let mark = 0; mark < PogoSim.finish; mark += 50) {
    const signX = screenX(mark);
    if (signX < -24 || signX > 784) continue;
    ctx.fillStyle = '#64776c';
    ctx.fillRect(signX - 2, 158, 4, 33);
    ctx.fillStyle = '#39594e';
    ctx.beginPath(); ctx.roundRect(Math.round(signX) - 25, 139, 50, 24, 7); ctx.fill();
    ctx.strokeStyle = '#c6d7a1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(Math.round(signX) - 22, 142, 44, 18, 5); ctx.stroke();
    ctx.fillStyle = '#fffdf5';
    ctx.textAlign = 'center'; ctx.font = '600 12px system-ui';
    ctx.fillText(mark === 0 ? 'Start' : mark + ' m', signX, 155);
  }

  if (finishX < 770 && finishX > -20) {
    for (let y = 63, row = 0; y < lastLaneY + 14; y += 8, row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = (row + col) % 2 ? '#faf9f0' : '#324c43';
        ctx.fillRect(finishX + col * 8, y, 8, Math.min(8, lastLaneY + 14 - y));
      }
    }
  }

  if (front >= PogoSim.finish - 100 && s.phase !== 'finished') {
    const flagX = Math.min(722, Math.max(32, finishX + 8));
    ctx.fillStyle = '#39594e';
    ctx.beginPath(); ctx.roundRect(flagX - 21, 13, 42, 34, 8); ctx.fill();
    ctx.beginPath();
    if (finishX > 752) {
      ctx.moveTo(flagX + 18, 19); ctx.lineTo(flagX + 34, 30); ctx.lineTo(flagX + 18, 41);
    } else {
      ctx.moveTo(flagX - 9, 44); ctx.lineTo(finishX + 8, 61); ctx.lineTo(flagX + 9, 44);
    }
    ctx.fill();
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(flagX - 10, 20, 2, 21);
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      ctx.fillStyle = (row + col) % 2 ? '#24382f' : '#fffdf5';
      ctx.fillRect(flagX - 8 + col * 6, 20 + row * 6, 6, 6);
    }
  }

  s.riders.forEach((r, i) => {
    const y = laneY(i);
    const x = screenX(positions[i]);
    const height = (19 + r.jump * 1.65) * 4 * progress * (1 - progress);
    ctx.fillStyle = '#96aaa0'; ctx.beginPath(); ctx.ellipse(x,y,12,4,0,0,Math.PI*2); ctx.fill();
    if (s.phase === 'air' && r.charge === PogoSim.cap) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = .85 * Math.sin(progress * Math.PI);
      for (let strand = 0; strand < 3; strand++) {
        ctx.beginPath();
        for (let sample = 0; sample <= 8; sample++) {
          const t = Math.max(0, progress - sample * (.022 + strand * .005));
          const trailX = screenX(r.distance + r.jump * t) - 10 - strand * 3;
          const trailY = y - 26 - strand * 6 - (19 + r.jump * 1.65) * 4 * t * (1 - t);
          if (sample === 0) ctx.moveTo(trailX, trailY);
          else ctx.lineTo(trailX, trailY);
        }
        ctx.strokeStyle = strand === 1 ? '#b4e8ec' : '#fffefa';
        ctx.lineWidth = strand === 1 ? 3 : 2;
        ctx.stroke();
      }
      ctx.restore();
    }
    if (pogoRiders.complete && pogoRiders.naturalWidth) {
      const frame = pogoFrame(s, r);
      rememberSprite(r.slot, pogoRiders, frame, 128, x, y - height - 33, 72);
      ctx.drawImage(pogoRiders, frame * 128, r.slot * 128, 128, 128,
        x - 36, y - height - 69, 72, 72);
    } else {
      ctx.fillStyle = '#546d60'; ctx.fillRect(x - 2,y - height - 20,4,20);
      ctx.fillStyle = colors[r.slot]; ctx.fillRect(x - 9,y - height - 10,18,4);
      drawFigure(ctx, r.slot, x, y - height - 7, 52);
    }
  });

  // Draw charge meters above the riders.
  s.riders.forEach((r, i) => {
    const y = laneY(i);
    ctx.font = '600 16px system-ui';
    ctx.textAlign = 'center';
    for (let pip = 0; pip < PogoSim.cap; pip++) {
      ctx.fillStyle = pip < r.charge ? colors[r.slot] : '#d1cdc7';
      ctx.fillRect(320 + pip * 18, y + 25,14,10);
    }
    ctx.fillStyle = '#354b41';
    if (r.charge === PogoSim.cap) ctx.fillText('Burst!', 484, y + 35);
  });
  ctx.restore();
}
if (typeof module !== 'undefined') module.exports = { PogoSim, pumpDetector };
