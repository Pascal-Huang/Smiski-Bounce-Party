const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, strokeSampler } = require('../web/motion');

test('two rounds complete setup and a missed verification keeps prior progress', async () => {
  const elements = { enableMotion: {}, motionStatus: {} };
  const progress = [];
  const swings = [];
  let listener, now = 0;
  const window = { isSecureContext: true, DeviceMotionEvent: {},
    addEventListener: (_, fn) => { listener = fn; }, removeEventListener() {} };
  require('node:vm').runInNewContext(require('node:fs').readFileSync(require.resolve('../web/motion'), 'utf8'), {
    window, document: { hidden: false }, performance: { now: () => now }, setTimeout, clearTimeout,
    el: id => elements[id], match: { id: 'demo', phase: 'calibration' },
    socket: { emit: (_, data) => progress.push(data.step) },
    stroke: (swing, lane) => { if (swing) swings.push(lane); }
  });
  await elements.enableMotion.onclick();
  function move(x, y) {
    for (let i = 0; i < 44; i++) {
      now += 16;
      listener({ acceleration: { x: i < 40 ? 0 : x, y: i < 40 ? 0 : y, z: 0 } });
    }
  }
  move(-8, 0); move(-8, 0); move(8, 0); move(0, 8);
  move(-8, 0); move(0, 8); move(8, 0); move(0, 8); move(-8, 0);
  assert.deepEqual(progress, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(swings, [-1]);
});

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
