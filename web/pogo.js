const PogoSim = (() => {
  const cap = 7, chargeTicks = 114, airTicks = 30, finish = 420;
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
  ctx.clearRect(0, 0, 760, 500);
  s.riders.forEach((r, i) => {
    const y = 119 + i * 103, left = 38 + i * 12;
    const progress = s.phase === 'air' ? s.age / PogoSim.airTicks : 0;
    const x = left + 540 * (r.distance + r.jump * progress) / PogoSim.finish;
    const height = 48 * 4 * progress * (1 - progress);
    ctx.fillStyle = '#dce5db';
    ctx.beginPath(); ctx.roundRect(left - 15, y - 5, 598, 19, 9); ctx.fill();
    ctx.fillStyle = '#a9bab0';
    for (let mark = 1; mark < 7; mark++) ctx.fillRect(left + 540 * mark / 7, y + 6, 2, 7);
    for (let col = 0; col < 2; col++) for (let row = 0; row < 4; row++) {
      ctx.fillStyle = (col + row) % 2 ? '#f2f2e9' : '#566e63';
      ctx.fillRect(left + 540 + col * 5, y - 5 + row * 5, 5, 5);
    }
    ctx.fillStyle = '#96aaa0'; ctx.beginPath(); ctx.ellipse(x,y,12,4,0,0,Math.PI*2); ctx.fill();
    if (pogoRiders.complete && pogoRiders.naturalWidth) {
      const frame = pogoFrame(s, r);
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
