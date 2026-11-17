// Flight progress runs from the hitter's end (0) to the receiver's end (1).
const TennisSim = (() => {
  const beat = 0.96;
  function timing(progress) {
    if (progress < beat - 0.10) return 'Very early';
    if (progress < beat - 0.04) return 'Early';
    if (progress <= beat + 0.04) return 'Perfect';
    if (progress <= beat + 0.10) return 'Late';
    return 'Very late';
  }
  function serve(s, server) {
    Object.assign(s, { hitter: server, flight: 0, duration: 88, pause: 60,
      from: 0, to: 0, attempted: false });
  }
  function create(players) {
    const s = { tick: 0, winner: null, notice: '', players: players.map(p => ({
      ...p, score: 0, charge: 0, lane: 0
    })) };
    serve(s, 0);
    return s;
  }
  function point(s) {
    const winner = s.players[s.hitter], loser = s.players[1 - s.hitter];
    winner.score++;
    s.notice = winner.name + ' scores';
    if (winner.score === 7) s.winner = s.hitter;
    else serve(s, (winner.score + loser.score) % 2);
  }
  function step(s, inputs) {
    if (s.winner !== null) return;
    s.tick++;
    for (const p of s.players) {
      const lane = inputs[p.slot]?.lane;
      if ([-1, 0, 1].includes(lane)) p.lane = lane;
      if (inputs[p.slot]?.swing) {
        p.swingTick = s.tick;
        p.swingLane = inputs[p.slot].shotLane ?? p.lane;
      }
    }
    if (s.pause) { s.pause--; return; }
    s.flight++;
    const receiver = 1 - s.hitter;
    const player = s.players[receiver];
    const action = inputs[player.slot];
    const progress = s.flight / s.duration;
    // The court's bounce arc reaches the tabletop at three quarters of the flight.
    if (s.players[s.hitter].superSmash && s.duration === 33 &&
        s.flight === Math.ceil(s.duration * 0.75)) {
      s.smashImpact = { tick: s.tick, x: s.from + (s.to - s.from) * 0.75,
        depth: s.hitter === 0 ? 0.75 : 0.25 };
    }
    if (action?.swing && !s.attempted) {
      s.attempted = true;
      const grade = timing(progress);
      player.grade = grade;
      player.gradeTick = s.tick;
      player.superSmash = false;
      if (progress >= 0.80 && progress <= 1.12) {
        const perfect = grade === 'Perfect';
        const smash = perfect && player.charge === 3;
        if (smash) player.charge = 0;
        else if (perfect) player.charge++;
        player.superSmash = smash;
        s.notice = player.name + ' · ' + (smash ? 'Supersmash' : grade);
        Object.assign(s, { hitter: receiver, from: s.to, flight: 0, attempted: false,
          duration: smash ? 33 : perfect ? 50 : grade.startsWith('Very') ? 86 : 68,
          to: (receiver ? -1 : 1) * (action.shotLane ?? player.lane) * (smash ? 0.96 : 0.77) });
      }
    }
    if (s.flight / s.duration > 1.12) point(s);
  }
  // Roll once per incoming shot at the same timing used for a human return.
  function botInputs(s, random = Math.random) {
    if (s.winner !== null || s.pause || s.attempted) return {};
    const receiver = s.players[1 - s.hitter];
    const target = Math.ceil(s.duration * beat);
    if (!receiver.bot || s.flight + 1 !== target) return {};
    return random() < 0.75 ? { [receiver.slot]: { swing: true, lane: 0 } } : {};
  }
  return { create, step, beat, botInputs };
})();
if (typeof module !== 'undefined') module.exports = TennisSim;
