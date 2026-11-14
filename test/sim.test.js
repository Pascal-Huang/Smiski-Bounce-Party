const test = require('node:test');
const assert = require('node:assert/strict');
const { create, step } = require('../web/sim');
const players = [{ slot: 0, name: 'Alex' }, { slot: 1, name: 'Lee' }];

test('boost spends charge on press and respects its cooldown', () => {
  const state = create(players);
  const car = state.cars[0];
  car.charge = 3;
  const controls = { 0: { boost: true, x: 0, y: 1 } };
  step(state, controls);
  assert.equal(car.power, true);
  assert.equal(car.cooldown, 180);
  assert.equal(car.charge, 0);
  assert.ok(car.vy > 3);
  step(state, controls);
  assert.equal(car.cooldown, 179);
});

test('a powered collision doubles knockback and awards a ring-out once', () => {
  function hit(charge) {
    const state = create(players);
    Object.assign(state.cars[0], { x: 82, y: 0, charge });
    Object.assign(state.cars[1], { x: 96, y: 0 });
    step(state, { 0: { x: 1, boost: true } });
    return state;
  }
  const state = hit(3);
  assert.equal(state.cars[1].vx, hit(0).cars[1].vx * 2);
  step(state, {});
  assert.equal(state.cars[0].score, 1);
  assert.equal(state.cars[1].out, 120);
  for (let i = 0; i < 120; i++) step(state, {});
  assert.equal(state.cars[1].shield, 90);
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
