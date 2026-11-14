const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, strokeSampler } = require('../web/motion');

test('learned directions survive a rotated or reversed grip', () => {
  for (const axes of [
    [[1,0,0], [-1,0,0], [0,1,0]],
    [[0,0,-1], [0,0,1], [-1,0,0]]
  ]) {
    axes.forEach((direction, i) => assert.equal(classify(direction, axes), i));
    const diagonal = axes[0].map((x, i) => (x + axes[2][i]) / Math.sqrt(2));
    assert.equal(classify(diagonal, axes), -1);
  }
});
test('captures signed launch acceleration once and ignores the braking impulse', () => {
  const sample = strokeSampler();
  const gestures = [];
  for (let t = 0; t <= 800; t += 16) {
    const x = t < 160 ? 0 : t < 240 ? -8 : t < 320 ? 9 : 0;
    const vector = sample([x, 0, 0], t);
    if (vector) gestures.push(vector);
  }
  assert.deepEqual(gestures, [[-1,0,0]]);
});
