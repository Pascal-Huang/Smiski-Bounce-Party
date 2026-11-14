// Learn signed acceleration directions in the phone's own coordinate system.
const strokes = [
  { lane: -1, label: 'swing left' }, { lane: 1, label: 'swing right' },
  { lane: 0, label: 'push forward' }
];
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
function classify(vector, templates) {
  const scores = templates.map((v, index) => ({ index, score: dot(v, vector) }))
    .sort((a, b) => b.score - a.score);
  return scores[0].score >= 0.72 && scores[0].score - scores[1].score >= 0.18
    ? scores[0].index : -1;
}
function strokeSampler() {
  let quietSince, armed = false, samples = [], start, last = -Infinity;
  return (v, now) => {
    const strength = Math.hypot(...v);
    if (!samples.length) {
      if (strength < 2) {
        quietSince ??= now;
        if (now - quietSince >= 130 && now - last > 360) armed = true;
        return;
      }
      quietSince = undefined;
      if (!armed || strength < 4) return;
      start = now;
      armed = false;
    }
    samples.push(v);
    if (now - start < 32) return;
    const sum = [0, 1, 2].map(i => samples.reduce((n, sample) => n + sample[i], 0));
    const magnitude = Math.hypot(...sum);
    const consistent = magnitude >= 3 * samples.length && now - start < 110;
    samples = [];
    last = now;
    if (consistent) return sum.map(n => n / magnitude);
  };
}

const paddleMotion = { active: false, lane: 0 };
function refreshPaddle() {
  el('paddle').hidden = paddleMotion.active || !tennis() || match.phase !== 'playing' || !myCar();
}
function installMotion() {
  let session = 0, cleanup = () => {};
  function stop(message) {
    session++;
    cleanup();
    cleanup = () => {};
    paddleMotion.active = false;
    paddleMotion.lane = 0;
    el('enableMotion').disabled = false;
    el('enableMotion').textContent = 'Enable paddle motion';
    el('useTouch').hidden = true;
    el('motionStatus').textContent = message;
    refreshPaddle();
    stroke(false);
  }
  el('useTouch').onclick = () => stop('Touch controls selected.');
  el('enableMotion').onclick = async () => {
    stop('Hold still in your playing grip.');
    const current = session;
    if (!window.isSecureContext) return stop('Open the room over trusted HTTPS to enable motion.');
    const sensors = [window.DeviceMotionEvent];
    if (sensors.some(sensor => !sensor)) return stop('This browser has no paddle sensors. Touch controls are available.');
    el('enableMotion').disabled = true;
    try {
      const permissions = await Promise.all(sensors.map(sensor => sensor.requestPermission?.()));
      if (session !== current) return;
      if (permissions.includes('denied')) return stop('Motion permission was denied. Enable it in browser settings or use touch.');
    } catch { if (session === current) stop('Motion permission unavailable. Try again or use touch.'); return; }
    const templates = [];
    let verified = 0;
    const sample = strokeSampler();
    const prompt = () => paddleMotion.active ? 'Ready. Swing left, swing right, or push forward.'
      : 'Pause in your grip, then ' + strokes[templates.length < 3 ? templates.length : verified].label
        + (templates.length < 3 ? '.' : ' again to verify.');
    el('motionStatus').textContent = prompt();
    el('useTouch').hidden = false;
    const timeout = setTimeout(() => stop('No linear acceleration readings. Retry or use touch.'), 6500);
    function movement(event) {
      const a = event.acceleration;
      if (!a || ![a.x, a.y, a.z].every(Number.isFinite)) return;
      clearTimeout(timeout);
      if (document.hidden) return;
      const v = sample([a.x, a.y, a.z], performance.now());
      if (!v) return;
      if (templates.length < 3) {
        if (templates.some(t => dot(t, v) > 0.65)) {
          el('motionStatus').textContent = 'Too similar to an earlier stroke. ' + prompt();
          return;
        }
        templates.push(v);
      } else {
        const index = classify(v, templates);
        if (paddleMotion.active) {
          if (index < 0) return;
          paddleMotion.lane = strokes[index].lane;
          el('motionStatus').textContent = 'Detected: ' + strokes[index].label;
          stroke(true, paddleMotion.lane);
          return;
        }
        if (index !== verified) {
          templates.length = 0;
          verified = 0;
          el('motionStatus').textContent = 'Direction check failed. Start again. ' + prompt();
          return;
        }
        if (++verified === 3) {
          paddleMotion.active = true;
          el('enableMotion').disabled = false;
          el('enableMotion').textContent = 'Recalibrate grip';
          refreshPaddle();
        }
      }
      el('motionStatus').textContent = prompt();
    }
    window.addEventListener('devicemotion', movement);
    cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('devicemotion', movement);
    };
  };
}
if (typeof window !== 'undefined') installMotion();
if (typeof module !== 'undefined') module.exports = { classify, strokeSampler };
