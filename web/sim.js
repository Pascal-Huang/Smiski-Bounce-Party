// Fixed 60 Hz, circular arena of radius 100 in ground-plane units.
const BumperSim = (() => {
  const boostCapacity = 5;
  function spawn(car) {
    const angle = car.slot * Math.PI / 2;
    Object.assign(car, { x: 50 * Math.cos(angle), y: 50 * Math.sin(angle),
      vx: 0, vy: 0, dx: -Math.cos(angle), dy: -Math.sin(angle),
      contacts: {}, dash: 0, power: false, lastHit: null, hitTick: -200 });
  }
  function create(players) {
    return { tick: 0, notice: '', cars: players.map(({ slot, name }) => {
      const car = { slot, name, score: 0, cooldown: 0, charge: 0, out: 0, shield: 0 };
      spawn(car);
      return car;
    }) };
  }
  function step(state, inputs) {
    if (state.tick >= 3600) return;
    state.tick++;
    for (const c of state.cars) {
      if (c.out) {
        if (--c.out === 0) { spawn(c); c.shield = 90; }
        continue;
      }
      const input = inputs[c.slot] || {};
      const x = input.x || 0, y = input.y || 0;
      const length = Math.hypot(x, y);
      if (length) { c.dx = x / length; c.dy = y / length; }
      c.cooldown = Math.max(0, c.cooldown - 1);
      if (input.boost && !c.cooldown) {
        c.power = c.charge >= boostCapacity;
        const launchSpeed = c.power ? 3.4 : 2.4;
        c.vx = c.dx * launchSpeed; c.vy = c.dy * launchSpeed;
        c.dash = 17; c.cooldown = 180;
        if (c.power) c.charge = 0;
      }
      if (c.dash) c.dash--;
      else {
        c.power = false;
        c.vx = c.vx * 0.94 + x * 0.072;
        c.vy = c.vy * 0.94 + y * 0.072;
      }
      c.x += c.vx; c.y += c.vy;
      c.shield = Math.max(0, c.shield - 1);
    }
    const active = state.cars.filter(c => !c.out && !c.shield);
    for (const [i, a] of active.entries()) for (const b of active.slice(i + 1)) {
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance >= 14) continue;
      const nx = distance ? (b.x - a.x) / distance : 1;
      const ny = distance ? (b.y - a.y) / distance : 0;
      const overlap = (14 - distance) / 2;
      a.x -= nx * overlap; a.y -= ny * overlap;
      b.x += nx * overlap; b.y += ny * overlap;
      const speed = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      for (const [driver, other, direction] of [[a, b, 1], [b, a, -1]]) {
        const approach = (driver.vx * nx + driver.vy * ny) * direction;
        if (speed > 0 && approach > 0.25 && driver.charge < boostCapacity &&
            state.tick - (driver.contacts[other.slot] ?? -100) > 15) {
          driver.charge++;
          driver.chargeTick = state.tick;
        }
        driver.contacts[other.slot] = state.tick;
      }
      if (speed <= 0) {
        // Resolving overlap can push a car over the rim even as the cars separate.
        a.lastHit = b.slot; b.lastHit = a.slot;
        a.hitTick = b.hitTick = state.tick;
        continue;
      }
      const impulse = speed * 0.9;
      const kickA = impulse * (b.power ? 2 : 1);
      const kickB = impulse * (a.power ? 2 : 1);
      a.vx -= nx * kickA; a.vy -= ny * kickA;
      b.vx += nx * kickB; b.vy += ny * kickB;
      a.lastHit = b.slot; b.lastHit = a.slot;
      a.hitTick = b.hitTick = state.tick;
      a.power = b.power = false;
    }
    for (const car of state.cars) {
      if (car.out || Math.hypot(car.x, car.y) <= 100) continue;
      const radius = Math.hypot(car.x, car.y);
      car.x *= 100 / radius; car.y *= 100 / radius;
      car.vx = car.vy = car.dash = 0;
      car.power = false;
      car.charge = 0;
      car.out = 120;
      const scorer = state.cars.find(c => c.slot === car.lastHit);
      if (scorer && state.tick - car.hitTick <= 120) {
        scorer.score++;
        state.notice = scorer.name + ' scored against ' + car.name;
      } else state.notice = car.name + ' drove off the edge';
    }
  }
  return { create, step, boostCapacity };
})();
if (typeof module !== 'undefined') module.exports = BumperSim;
