const PartyAudio = (() => {
  let context, master, musicBus, effectsBus, previous;
  let scene = 'lobby', player, trackScene;
  const playlists = { lobby: ['/fireside.mp3', '/lobby-2.mp3'], playing: ['/game-2.mp3', '/game-3.mp3', '/game-4.mp3'] };
  const lastTrack = {};
  function chooseTrack() {
    const choices = playlists[scene].filter(track => track !== lastTrack[scene]);
    const track = choices[Math.floor(Math.random() * choices.length)];
    player.src = lastTrack[scene] = track;
    trackScene = scene;
  }
  const settings = { music: true, effects: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('party-audio') || '{}')); } catch {}
  const panel = document.getElementById('audioControls');
  panel.hidden = !host;
  function tone(freq, length, volume, bus, delay = 0, end = freq, type = 'sine') {
    if (!context || context.state !== 'running') return;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, at);
    oscillator.frequency.exponentialRampToValueAtTime(end, at + length);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    oscillator.connect(envelope).connect(bus);
    oscillator.start(at); oscillator.stop(at + length + .02);
  }
  function mix() {
    if (!context) return;
    musicBus.gain.setTargetAtTime(settings.music ? 1.32 : 0, context.currentTime, .03);
    effectsBus.gain.setTargetAtTime(settings.effects ? 4.5 : 0, context.currentTime, .03);
    if (trackScene !== scene && playlists[scene]) chooseTrack();
    if (playlists[scene] && settings.music && !document.hidden) {
      if (player.paused) player.play().catch(() => {});
    } else player.pause();
    trackScene = scene;
    master.gain.setTargetAtTime(document.hidden ? 0 : 1, context.currentTime, .03);
  }
  async function unlock() {
    if (!host) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio(); master = context.createGain();
        musicBus = context.createGain(); effectsBus = context.createGain();
        musicBus.connect(master); effectsBus.connect(master);
        // Keep overlapping cues controlled at the louder mix level.
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -3;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = .003;
        limiter.release.value = .15;
        master.connect(limiter); limiter.connect(context.destination);
        player = new window.Audio();
        player.onended = () => { if (playlists[scene]) { chooseTrack(); mix(); } };
        context.createMediaElementSource(player).connect(musicBus);
        mix();
      }
      await context.resume();
      mix();
    } catch { /* Browsers may require another local gesture to enable audio. */ }
  }
  for (const kind of ['music', 'effects']) {
    const button = document.getElementById(kind + 'Toggle');
    const render = () => {
      button.textContent = (kind === 'music' ? 'Music' : 'Effects') + ': ' + (settings[kind] ? 'on' : 'off');
      button.setAttribute('aria-pressed', String(settings[kind]));
    };
    render();
    button.onclick = () => {
      settings[kind] = !settings[kind]; render(); mix();
      try { localStorage.setItem('party-audio', JSON.stringify(settings)); } catch {}
      unlock();
    };
  }
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', mix);
  let airBuffer;
  function whoosh() {
    const length = .32, at = context.currentTime;
    if (!airBuffer) {
      airBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
      const samples = airBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    const air = context.createBufferSource(), filter = context.createBiquadFilter();
    const envelope = context.createGain();
    air.buffer = airBuffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, at);
    filter.frequency.exponentialRampToValueAtTime(3800, at + .23);
    envelope.gain.setValueAtTime(.001, at);
    envelope.gain.linearRampToValueAtTime(.42, at + .10);
    envelope.gain.exponentialRampToValueAtTime(.001, at + length);
    air.connect(filter).connect(envelope).connect(effectsBus);
    air.start(at);
  }
  function cue(name) {
    if (!host || !effectsBus || !settings.effects || context.state !== 'running') return;
    if (name === 'poweredLaunch') whoosh();
    const notes = {
      count: [[440, .1, .24]], go: [[523, .12, .3], [784, .22, .3, .12]],
      jump: [[220, .22, .3, 0, 660]], land: [[140, .16, .35, 0, 65]],
      hit: [[380, .08, .25, 0, 180]], boost: [[150, .22, .3, 0, 700]],
      point: [[659, .12, .3], [880, .2, .3, .1]],
      out: [[440, .35, .3, 0, 110]],
      superBoost: [[165, .24, .32, 0, 660], [660, .13, .27, .12], [990, .27, .25, .21]],
      // Alternating pitch bends mimic the recoil of a spring, then two metallic strikes ring out.
      burst: [[145, .09, .31, 0, 540], [540, .07, .25, .08, 230], [230, .08, .20, .14, 420],
        [420, .07, .14, .21, 300], [1047, .08, .24, .29], [1568, .39, .25, .38], [3730, .17, .10, .38]],
      perfect: [[880, .22, .28], [1319, .32, .23, .075]],
      // Layer a sharp attack over a longer bass tail.
      supersmash: [[210, .16, .48, 0, 55, 'triangle'], [90, .63, .43, .025, 38],
        [340, .08, .19, 0, 115, 'sawtooth'], [125, .30, .16, .10, 58]],
      poorTiming: [[311, .13, .16, 0, 294, 'triangle'], [262, .21, .17, .13, 228, 'triangle']],
      win: [[523, .22, .3], [659, .22, .3, .16], [784, .22, .3, .32], [1047, .55, .3, .5]]
    };
    for (const [freq, length, volume, delay = 0, end = freq, type] of notes[name] || [])
      tone(freq, length, volume, effectsBus, delay, end, type);
  }
  function observe(game, state, countdown) {
    if (!host) return;
    const players = state.riders || state.players || state.cars;
    const current = { game, count: Math.ceil(countdown / 1000), phase: state.phase,
      score: players.reduce((sum, p) => sum + (p.score || 0), 0),
      cars: state.cars?.map(c => ({ charge: c.charge, out: c.out, cooldown: c.cooldown, hitTick: c.hitTick })),
      riderCharge: state.riders?.map(r => r.charge),
      grades: state.players?.map(p => p.gradeTick) };
    if (previous?.game === game) {
      if (current.count !== previous.count) cue(current.count ? 'count' : 'go');
      if (!current.count) {
        if (current.riderCharge?.some((charge, i) => charge === PogoSim.cap && previous.riderCharge[i] < charge)) cue('burst');
        if (current.phase !== previous.phase) {
          if (current.phase === 'air') cue('jump');
          else if (previous.phase === 'air') cue('land');
        }
        if (current.score > previous.score) cue('point');
        if (current.cars?.some((c, i) => c.out && !previous.cars[i].out)) cue('out');
        else if (current.cars?.some((c, i) => c.hitTick > previous.cars[i].hitTick)) cue('hit');
        if (current.cars?.some((c, i) => c.charge === BumperSim.boostCapacity && previous.cars[i].charge < c.charge)) cue('superBoost');
        if (current.cars?.some((c, i) => c.cooldown > previous.cars[i].cooldown)) {
          cue('boost');
          if (current.cars.some((c, i) => c.cooldown > previous.cars[i].cooldown && previous.cars[i].charge === BumperSim.boostCapacity)) cue('poweredLaunch');
        }
        state.players?.forEach((player, i) => {
          if (player.gradeTick === previous.grades[i]) return;
          if (player.superSmash) cue('supersmash');
          else if (player.grade === 'Perfect') cue('perfect');
          else if (player.grade === 'Very early' || player.grade === 'Very late') cue('poorTiming');
          else cue('hit');
        });
      }
    } else if (current.count) cue('count');
    previous = current;
  }
  return { observe, cue, setScene(next) { scene = next; mix(); }, reset: () => { previous = undefined; } };
})();
