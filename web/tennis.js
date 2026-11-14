// Flight progress runs from the hitter's end (0) to the receiver's end (1).
const TennisSim = (() => {
  function serve(s, server) {
    Object.assign(s, { hitter: server, flight: 0, duration: 88, pause: 60,
      from: 0, to: 0, attempted: false });
  }
  function create(players) {
    const s = { tick: 0, winner: null, notice: '', players: players.map(p => ({
      ...p, score: 0, losses: 0, smash: false, lane: 0
    })) };
    serve(s, 0);
    return s;
  }
  function point(s) {
    const winner = s.players[s.hitter], loser = s.players[1 - s.hitter];
    winner.score++;
    winner.losses = 0;
    loser.losses++;
    winner.smash = false;
    loser.smash = loser.losses === 2;
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
    }
    if (s.pause) { s.pause--; return; }
    s.flight++;
    const receiver = 1 - s.hitter;
    const player = s.players[receiver];
    const action = inputs[player.slot];
    const progress = s.flight / s.duration;
    if (action?.swing && !s.attempted) {
      s.attempted = true;
      if (progress >= 0.80 && progress <= 1.12) {
        const perfect = Math.abs(progress - 0.96) <= 0.055;
        const smash = perfect && player.smash;
        if (smash) player.smash = false;
        s.notice = player.name + (smash ? ' · Rubber Smash!' : perfect ? ' · Perfect!' : ' returns');
        Object.assign(s, { hitter: receiver, from: s.to, flight: 0, attempted: false,
          duration: smash ? 41 : perfect ? 55 : 76,
          to: (receiver ? -1 : 1) * (action.shotLane ?? player.lane) * (smash ? 0.96 : 0.77) });
      }
    }
    if (s.flight / s.duration > 1.12) point(s);
  }
  return { create, step };
})();
if (typeof module !== 'undefined') module.exports = TennisSim;
