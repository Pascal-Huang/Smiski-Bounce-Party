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

function drawTrack(ctx, s, colors) {
  ctx.clearRect(0, 0, 760, 500);
  s.riders.forEach((r, i) => {
    const y = 98 + i * 103, left = 38 + i * 12;
    const progress = s.phase === 'air' ? s.age / PogoSim.airTicks : 0;
    const x = left + 540 * (r.distance + r.jump * progress) / PogoSim.finish;
    const height = 48 * 4 * progress * (1 - progress);
    ctx.fillStyle = '#e1ece7'; ctx.fillRect(left, y, 656, 15);
    ctx.fillStyle = '#233f38'; ctx.fillRect(left + 540, y - 8, 4, 27);
    ctx.fillStyle = '#79887e'; ctx.beginPath(); ctx.ellipse(x,y,12,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = colors[r.slot]; ctx.fillRect(x - 2,y - height - 20,4,20);
    ctx.beginPath(); ctx.arc(x,y - height - 22,10,0,Math.PI*2); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = 'bold 17px sans-serif';
    ctx.fillText(r.name + ' · ' + r.distance + ' m', left, y + 37);
    ctx.fillStyle = '#dee3e3'; ctx.fillRect(left + 290,y + 23,120,12);
    ctx.fillStyle = r.charge === PogoSim.cap ? '#d78a00' : colors[r.slot];
    ctx.fillRect(left + 290,y + 23,120 * r.charge / PogoSim.cap,12);
    if (r.charge === PogoSim.cap) ctx.fillText('Burst!',left + 420,y + 35);
  });
}
if (typeof module !== 'undefined') module.exports = { PogoSim, pumpDetector };
