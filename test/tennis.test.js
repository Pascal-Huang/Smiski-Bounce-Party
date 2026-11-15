const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create, step } = require('../web/tennis');
const players = [{ slot: 1, name: 'Left' }, { slot: 3, name: 'Right' }];

test('only the receiver can return, with corner aim relative to that player', () => {
  const s = create(players);
  s.pause = 0;
  s.flight = 83;
  step(s, { 1: { swing: true } });
  assert.equal(s.hitter, 0);
  step(s, { 3: { swing: true, lane: -1 } });
  assert.equal(s.hitter, 1);
  assert.ok(s.to > 0);
  s.flight = 44;
  step(s, { 1: { swing: true, lane: 1 } });
  assert.equal(s.to, 0.77);
});

test('misses award points, alternate service and stop at seven without deuce', () => {
  const s = create(players);
  s.players.forEach(p => { p.score = 5; });
  step(s, {});
  while (s.players[0].score === 5) step(s, {});
  assert.equal(s.hitter, 1);
  while (s.winner === null) step(s, {});
  assert.deepEqual(s.players.map(p => p.score), [7, 6]);
  const last = s.tick;
  step(s, {});
  assert.equal(s.tick, last);
});

test('the five grades set return speed and only perfects build charge', () => {
  for (const [flight, grade, duration] of [[81,'Very early',86], [88,'Early',68], [96,'Perfect',50], [104,'Late',68], [111,'Very late',86]]) {
    const s = create(players);
    Object.assign(s, { pause: 0, flight: flight - 1, duration: 100 });
    step(s, { 3: { swing: true } });
    assert.equal(s.players[1].grade, grade);
    assert.equal(s.duration, duration);
    assert.equal(s.players[1].charge, Number(grade === 'Perfect'));
  }
});

test('charge survives a lost point and the fourth perfect fires one Super Smash', () => {
  const s = create(players);
  for (let i = 1; i <= 4; i++) {
    Object.assign(s, { hitter: 0, pause: 0, duration: 100, flight: 95 });
    step(s, { 3: { swing: true } });
    assert.equal(s.players[1].charge, i % 4);
    assert.equal(s.duration, i === 4 ? 33 : 50);
    if (i === 2) {
      s.hitter = 0; s.flight = s.duration * 1.12;
      step(s, {});
      assert.equal(s.players[1].charge, 2);
    }
  }
  assert.equal(s.players[1].superSmash, true);
  assert.equal(s.players[0].charge, 0);
});
