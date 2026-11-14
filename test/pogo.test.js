const test = require('node:test');
const assert = require('node:assert/strict');
const { PogoSim, pumpDetector } = require('../web/pogo');
const riders = [{ slot: 0 }, { slot: 3 }];

test('charge is capped, frozen at launch and cleared on simultaneous landing', () => {
  const s = PogoSim.create(riders);
  while (s.phase === 'charge') PogoSim.step(s, { 3: { pump: true } });
  assert.equal(s.riders[1].charge, 7);
  assert.equal(s.riders[1].jump, 23);
  while (s.phase === 'air') PogoSim.step(s, { 0: { pump: true } });
  assert.deepEqual(s.riders.map(r => r.distance), [4,23]);
  assert.equal(s.round, 2);
  assert.equal(s.riders[1].charge, 0);
});
test('finish compares landing distances including ties', () => {
  for (const [distances, winners] of [[[98,99],[3]], [[97,97],[0,3]]]) {
    const s = PogoSim.create(riders);
    s.riders.forEach((r,i) => { r.distance = PogoSim.finish - 100 + distances[i]; });
    while (s.phase !== 'finished') PogoSim.step(s, {});
    assert.deepEqual(s.winners, winners);
  }
});
test('pump requires opposing peaks within one cycle', () => {
  const sample = pumpDetector();
  assert.equal(sample(5,0), false);
  assert.equal(sample(6,90), false);
  assert.equal(sample(-5,140), true);
  assert.equal(sample(-6,230), false);
  assert.equal(sample(5,500), false);
  assert.equal(sample(-8,1600), false);
});
