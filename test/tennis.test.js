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

test('two lost points grant one Rubber Smash that a perfect return spends', () => {
  const s = create(players);
  for (let i = 0; i < 2; i++) {
    s.hitter = 0; s.pause = 0; s.flight = s.duration * 1.12;
    step(s, {});
  }
  assert.equal(s.players[1].smash, true);
  s.pause = 0; s.flight = 83;
  step(s, { 3: { swing: true, lane: 1 } });
  assert.equal(s.duration, 41);
  assert.equal(s.players[1].smash, false);
});
