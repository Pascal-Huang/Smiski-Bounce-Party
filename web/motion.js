// Learn signed acceleration directions in the phone's own coordinate system.
const strokes = [
  { lane: -1, label: 'swing left', arrow: '←' }, { lane: 1, label: 'swing right', arrow: '→' },
  { lane: 0, label: 'push forward toward the host screen', arrow: '↑' }
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
function installMotion() {
  let session = 0, cleanup = () => {};
  function stop(message) {
    session++;
    cleanup();
    cleanup = () => {};
    paddleMotion.active = false;
    paddleMotion.lane = 0;
    el('enableMotion').disabled = false;
    el('enableMotion').hidden = true;
    el('motionStatus').textContent = message;
    stroke(false);
  }
  function progress(step) {
    if (match?.phase === 'calibration') socket.emit('calibration', { id: match.id, step });
  }
  function retry(message, label) {
    stop(message);
    el('enableMotion').textContent = label;
    el('enableMotion').hidden = false;
  }
  async function begin() {
    stop('Hold still in your playing grip.');
    const current = session;
    if (!window.isSecureContext) return stop('Open the room over trusted HTTPS to enable motion.');
    const sensors = [window.DeviceMotionEvent];
    if (sensors.some(sensor => !sensor)) return stop('Open this room on a phone with motion sensors.');
    el('enableMotion').disabled = true;
    try {
      const permissions = await Promise.all(sensors.map(sensor => sensor.requestPermission?.()));
      if (session !== current) return;
      if (permissions.includes('denied')) return retry('Allow motion access for this site in your browser settings.', 'Allow motion access');
    } catch { if (session === current) retry('Your phone needs permission to read swings.', 'Allow motion access'); return; }
    const templates = [];
    let verified = 0;
    const sample = strokeSampler();
    progress(1);
    el('motionStatus').textContent = '';
    const timeout = setTimeout(() => {
      retry('No motion readings. Check motion access and retry.', 'Retry sensor');
      progress(0);
    }, 6500);
    function movement(event) {
      const a = event.acceleration;
      if (!a || ![a.x, a.y, a.z].every(Number.isFinite)) return;
      clearTimeout(timeout);
      if (document.hidden) return;
      const v = sample([a.x, a.y, a.z], performance.now());
      if (!v) return;
      if (templates.length < 3) {
        if (templates.some(t => dot(t, v) > 0.65)) {
          el('motionStatus').textContent = 'That felt like the previous direction. Pause and try this stroke again.';
          return;
        }
        templates.push(v);
        progress(templates.length + 1);
        el('motionStatus').textContent = '';
      } else {
        const index = classify(v, templates);
        if (!paddleMotion.active) {
          if (index !== verified) {
            el('motionStatus').textContent = 'Pause and try the direction shown again.';
            return;
          }
          const combined = templates[index].map((value, i) => value + v[i]);
          const length = Math.hypot(...combined);
          templates[index] = combined.map(value => value / length);
          verified++;
          paddleMotion.active = verified === strokes.length;
          progress(4 + verified);
          el('motionStatus').textContent = '';
          return;
        }
        if (index < 0) return;
        paddleMotion.lane = strokes[index].lane;
        stroke(true, paddleMotion.lane);
      }
    }
    window.addEventListener('devicemotion', movement);
    cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('devicemotion', movement);
    };
  }
  el('enableMotion').onclick = begin;
  return { begin, stop };
}
const paddleSetup = typeof window !== 'undefined' && installMotion();
if (typeof module !== 'undefined') module.exports = { classify, strokeSampler };
