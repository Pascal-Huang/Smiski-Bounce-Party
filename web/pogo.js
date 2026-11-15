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

function drawTrack(ctx, s, colors) {
  const progress = s.phase === 'air' ? s.age / PogoSim.airTicks : 0;
  const positions = s.riders.map(r => r.distance + r.jump * progress);
  const front = Math.max(...positions), rear = Math.min(...positions);
  // Keep space ahead of the pack and widen only as the outer riders separate.
  const scale = Math.min(10, 580 / Math.max(1, front - rear));
  const offset = Math.max(-60, (front + rear) * scale / 2 - 350);
  const screenX = meters => meters * scale - offset;
  ctx.clearRect(0, 0, 760, 500);
  ctx.fillStyle = '#aec3c1';
  ctx.fillRect(0, 0, 760, 65);
  for (let layer = 1; layer <= 2; layer++) {
    const spacing = layer === 1 ? 248 : 162;
    const drift = ((front + rear) * layer * 0.8) % spacing;
    ctx.fillStyle = layer === 1 ? '#d6dfd6' : '#edd4b5';
    for (let x = -drift; x < 760 + spacing; x += spacing) {
      ctx.beginPath();
      ctx.ellipse(x, 65, spacing * 0.68, 46 / layer, 0, Math.PI, 2 * Math.PI);
      ctx.fill();
    }
  }
  const firstMark = Math.max(0, Math.ceil(offset / scale / 5) * 5);
  const finishX = screenX(PogoSim.finish);
  const lastLaneY = 137 + (s.riders.length - 1) * 103;
  for (let y = 137; y <= lastLaneY; y += 103) {
    ctx.fillStyle = '#dce5db';
    ctx.fillRect(0, y - 5, 760, 19);
    for (let mark = firstMark; mark < PogoSim.finish && screenX(mark) < 760; mark += 5) {
      const major = mark % 50 === 0;
      ctx.fillStyle = '#849b90';
      ctx.fillRect(screenX(mark), y - 3, major ? 3 : 1, major ? 15 : 7);
    }
  }

  for (let mark = 0; mark < PogoSim.finish; mark += 50) {
    const signX = screenX(mark);
    if (signX < -24 || signX > 784) continue;
    ctx.fillStyle = '#64776c';
    ctx.fillRect(signX - 2, 99, 4, 33);
    ctx.fillStyle = '#39594e';
    ctx.beginPath(); ctx.roundRect(signX - 23, 82, 46, 20, 4); ctx.fill();
    ctx.fillStyle = '#fffdf5';
    ctx.textAlign = 'center'; ctx.font = '600 12px system-ui';
    ctx.fillText(mark === 0 ? 'Start' : mark + ' m', signX, 96);
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
    const y = 137 + i * 103, left = 24;
    const x = screenX(positions[i]);
    const height = (19 + r.jump * 1.65) * 4 * progress * (1 - progress);
    ctx.fillStyle = '#96aaa0'; ctx.beginPath(); ctx.ellipse(x,y,12,4,0,0,Math.PI*2); ctx.fill();
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
    ctx.fillStyle = '#31463c'; ctx.textAlign = 'left'; ctx.font = '600 17px system-ui';
    ctx.fillText(r.name, left, y + 36, 230);
    for (let pip = 0; pip < PogoSim.cap; pip++) {
      ctx.fillStyle = pip < r.charge ? colors[r.slot] : '#d1cdc7';
      ctx.beginPath(); ctx.roundRect(left + 290 + pip * 18,y + 23,14,10,3); ctx.fill();
    }
    ctx.fillStyle = '#354b41';
    if (r.charge === PogoSim.cap) ctx.fillText('Burst!',left + 420,y + 35);
  });
}
if (typeof module !== 'undefined') module.exports = { PogoSim, pumpDetector };
