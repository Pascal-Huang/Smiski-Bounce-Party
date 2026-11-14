let pumpSession = 0, removeSensor = () => {};
function stopPumpMotion() {
  pumpSession++;
  removeSensor();
  removeSensor = () => {};
  el('pumpMotion').disabled = false;
  el('pumpMotion').hidden = false;
  el('pumpStatus').textContent = '';
}
function sendPump() {
  if (socket.connected && pogo() && myCar() && match.phase === 'playing' &&
      countdown === 0 && state.phase === 'charge')
    socket.emit('input', { id: match.id, round: state.round, pump: true });
}
el('pump').onclick = sendPump;
socket.on('pump', data => {
  if (ownsSim() && pogo() && match.id === data.id && !countdown &&
      state.phase === 'charge' && data.round === state.round)
    inputs[data.slot] = { pump: true };
});
el('pumpMotion').onclick = async () => {
  const sensor = window.DeviceMotionEvent;
  if (!window.isSecureContext || !sensor) {
    el('pumpStatus').textContent = 'Motion needs a supported phone on HTTPS. Tap Pump to charge.';
    return;
  }
  const session = ++pumpSession;
  el('pumpMotion').disabled = true;
  try {
    const permission = await sensor.requestPermission?.();
    if (session !== pumpSession) return;
    if (permission === 'denied') throw new Error();
  } catch {
    if (session === pumpSession) {
      stopPumpMotion();
      el('pumpStatus').textContent = 'Motion unavailable. Tap Pump to charge.';
    }
    return;
  }
  const detect = pumpDetector();
  el('pumpStatus').textContent = 'Waiting for phone sensors…';
  const timeout = setTimeout(() => {
    stopPumpMotion();
    el('pumpStatus').textContent = 'No sensor readings. Tap Pump or retry motion.';
  }, 5000);
  function movement(event) {
    const a = event.acceleration, total = event.accelerationIncludingGravity;
    if (!a || !total || ![a.x,a.y,a.z,total.x,total.y,total.z].every(Number.isFinite)) return;
    const gx = total.x - a.x, gy = total.y - a.y, gz = total.z - a.z;
    const length = Math.hypot(gx,gy,gz);
    if (length < 2) return;
    clearTimeout(timeout);
    el('pumpMotion').hidden = true;
    el('pumpStatus').textContent = 'Pump the phone up and down while the charge bar is open.';
    if (!document.hidden && detect((gx*a.x + gy*a.y + gz*a.z) / length, performance.now())) sendPump();
  }
  window.addEventListener('devicemotion', movement);
  removeSensor = () => {
    clearTimeout(timeout);
    window.removeEventListener('devicemotion', movement);
  };
};
