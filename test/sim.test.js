const test = require('node:test');
const assert = require('node:assert/strict');
const { create, step } = require('../web/sim');
const players = [{ slot: 0, name: 'Alex' }, { slot: 1, name: 'Lee' }];

test('boost spends charge on press and respects its cooldown', () => {
  const state = create(players);
  const car = state.cars[0];
  car.charge = 5;
  const controls = { 0: { boost: true, x: 0, y: 1 } };
  step(state, controls);
  assert.equal(car.power, true);
  assert.equal(car.cooldown, 180);
  assert.equal(car.charge, 0);
  assert.ok(car.vy > 3);
  step(state, controls);
  assert.equal(car.cooldown, 179);
});

test('a powered dash hits harder and the knocked-out car respawns without charge', () => {
  function hit(charge) {
    const state = create(players);
    Object.assign(state.cars[0], { x: 82, y: 0, charge });
    Object.assign(state.cars[1], { x: 96, y: 0 });
    step(state, { 0: { x: 1, boost: true } });
    return state;
  }
  const state = hit(5);
  assert.equal(hit(4).cars[1].vx, hit(0).cars[1].vx);
  assert.equal(hit(4).cars[0].charge, 5);
  assert.equal(hit(0).cars[0].charge, 1);
  assert.equal(hit(0).cars[1].charge, 0);
  assert.ok(state.cars[1].vx > hit(0).cars[1].vx * 2);
  state.cars[1].charge = 5;
  step(state, {});
  assert.equal(state.cars[0].score, 1);
  assert.equal(state.cars[1].out, 120);
  const victim = state.cars[1];
  assert.equal(victim.charge, 0);
  const edge = [victim.x, victim.y];
  assert.ok(Math.abs(Math.hypot(...edge) - 100) < 1e-8);
  for (let i = 0; i < 119; i++) {
    step(state, { 1: { x: -1, boost: true } });
    assert.deepEqual([victim.x, victim.y], edge);
  }
  step(state, {});
  assert.equal(state.cars[1].shield, 90);
  assert.equal(victim.charge, 0);
  assert.equal(state.cars[0].score, 1);
});

test('old hits expire and the round ends at 60 seconds', () => {
  const state = create(players);
  state.tick = 121;
  Object.assign(state.cars[1], { x: 101, lastHit: 0, hitTick: 0 });
  step(state, {});
  assert.equal(state.cars[0].score, 0);
  for (let i = 0; i < 3600; i++) step(state, {});
  assert.equal(state.tick, 3600);
});

test('overlap at the rim credits the last opponent even without a closing impulse', () => {
  const state = create(players);
  Object.assign(state.cars[0], { x: 99, y: 0 });
  Object.assign(state.cars[1], { x: 90, y: 0 });
  step(state, {});
  assert.equal(state.cars[0].out, 120);
  assert.equal(state.cars[1].score, 1);
  step(state, {});
  assert.equal(state.cars[1].score, 1);
});
