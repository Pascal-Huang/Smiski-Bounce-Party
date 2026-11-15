const tennisFigures = new Image();
tennisFigures.src = '/tennis-players.png';

function drawTennisPlayer(ctx, player, tick, x, feet) {
  if (!tennisFigures.complete || !tennisFigures.naturalWidth) {
    drawFigure(ctx, player.slot, x, feet, 64);
    return;
  }
  const age = tick - (player.swingTick ?? -100);
  const forward = player.swingLane === 0;
  let frame = 0;
  if (age < 4) frame = forward ? 3 : 1;
  else if (age < 13) frame = forward ? 4 : 2;
  else if (age < 21) frame = 5;
  ctx.save();
  rememberSprite(player.slot, tennisFigures, frame, 160, x, feet - 38, 90, player.swingLane === -1 && frame !== 0);
  ctx.translate(x, feet);
  if (player.swingLane === -1 && frame !== 0) ctx.scale(-1, 1);
  ctx.drawImage(tennisFigures, frame * 160, player.slot * 160, 160, 160, -45, -83, 90, 90);
  ctx.restore();
}

function drawRhythm(ctx, player, center, tick) {
  const feedback = tick - player.gradeTick < 52;
  const color = player.superSmash ? '#bc267f' : player.grade === 'Perfect' ? '#a37100' :
    player.grade?.startsWith('Very') ? '#a34239' : '#945d13';
  if (feedback) {
    ctx.fillStyle = color; ctx.font = 'bold 18px system-ui';
    ctx.fillText(player.superSmash ? 'Supersmash' : player.grade, center, 178);
  }
  ctx.fillStyle = '#31463c'; ctx.font = 'bold 15px system-ui';
  ctx.fillText(player.charge === 3 ? 'Supersmash ready' : 'Smash  ' + player.charge + ' / 3', center, 471);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < player.charge ? '#d7a11e' : '#cdd5cb';
    ctx.beginPath(); ctx.roundRect(center - 58 + i * 40, 480, 36, 9, 4); ctx.fill();
  }
}

function drawCourt(ctx, state) {
  const hasScore = state.players.some(player => player.score > 0);
  document.getElementById('tennisStadium').classList.toggle('cheering',
    hasScore && (state.pause > 0 || state.winner !== null));
  ctx.clearRect(0, 0, 760, 500);
  ctx.fillStyle = '#b5b9af'; ctx.fillRect(379, 155, 2, 333);
  const travel = Math.min(1.12, state.flight / state.duration);
  const depth = state.hitter === 0 ? travel : 1 - travel;
  const lateral = state.from + (state.to - state.from) * Math.min(1, travel);
  // Each half projects the same table with its own player at the near edge.
  state.players.forEach((player, side) => {
    const direction = side ? -1 : 1;
    function project(x, z) {
      const d = side ? 1 - z : z;
      return [190 + side * 380 + direction * x * (156 - 76 * d), 417 - 230 * d];
    }
    function line(a, b, color, width) {
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    for (const edge of [-0.88, 0.88]) {
      const foot = project(edge, side);
      line(foot, [foot[0], foot[1] + 26], '#84998f', 7);
    }
    ctx.fillStyle = '#906344';
    ctx.beginPath();
    for (const [i, point] of [[-1,0],[1,0],[1,1],[-1,1]].entries()) {
      if (i === 0) ctx.moveTo(...project(...point)); else ctx.lineTo(...project(...point));
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e2e8d9'; ctx.lineWidth = 3; ctx.stroke();
    line(project(0,0), project(0,1), '#c0ded5', 2);
    const [aimX, aimY] = project(direction * player.lane * 0.77, 1 - side);
    line([aimX - 9, aimY], [aimX + 9, aimY], '#ffce55', 5);
    const net = [-1,1].map(x => project(x,0.5));
    const netY = net[0][1];
    for (let x = Math.min(net[0][0], net[1][0]); x < Math.max(net[0][0], net[1][0]); x += 6)
      line([x, netY - 13], [x, netY], '#425d54', 1);
    line(net[0],net[1],'#425d54',2);
    line([net[0][0], netY - 13], [net[1][0], netY - 13], '#f2f2e9', 3);
    const target = 1 - state.hitter === side;
    line(project(-1,side),project(1,side),'#eadccc',6);
    const [px, py] = project(target ? state.to : state.from, side);
    drawTennisPlayer(ctx, player, state.winner === null ? state.tick : Infinity, px, py + 24);
    const [bx, by] = project(lateral, depth);
    const height = 8 + 40 * Math.abs(Math.sin(Math.PI * (travel + 0.25)));
    if (depth >= 0 && depth <= 1 && Math.abs(lateral) <= 1) {
      ctx.fillStyle = '#593f30'; ctx.beginPath(); ctx.ellipse(bx,by,7,3,0,0,Math.PI*2); ctx.fill();
    }
    if (!state.pause && state.players[state.hitter].superSmash && state.duration === 33) {
      for (let i = 6; i > 0; i--) {
        const t = Math.max(0, travel - i * .026);
        const [x,y] = project(state.from + (state.to - state.from) * Math.min(1,t), state.hitter ? 1-t : t);
        const trailY = y - 8 - 40 * Math.abs(Math.sin(Math.PI * (t + .25)));
        ctx.fillStyle = i > 3 ? '#f04b27' : '#ff9a22';
        ctx.beginPath(); ctx.arc(x, trailY, 9-i, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.fillStyle = '#ffbb3c'; ctx.beginPath(); ctx.arc(bx,by-height,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#182f3a'; ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif';
    const center = 190 + side * 380;
    ctx.fillText(player.name, center, 155, 330);
    drawRhythm(ctx, player, center, state.tick);
  });
}
