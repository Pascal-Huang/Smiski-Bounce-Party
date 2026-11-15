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

function drawCourt(ctx, state) {
  ctx.clearRect(0, 0, 760, 500);
  const travel = Math.min(1.12, state.flight / state.duration);
  const depth = state.hitter === 0 ? travel : 1 - travel;
  const lateral = state.from + (state.to - state.from) * Math.min(1, travel);
  // Each half projects the same table with its own player at the near edge.
  state.players.forEach((player, side) => {
    const direction = side ? -1 : 1;
    function project(x, z) {
      const d = side ? 1 - z : z;
      return [190 + side * 380 + direction * x * (156 - 76 * d), 405 - 230 * d];
    }
    function line(a, b, color, width) {
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    for (const edge of [-0.88, 0.88]) {
      const foot = project(edge, side);
      line(foot, [foot[0], foot[1] + 26], '#84998f', 7);
    }
    ctx.fillStyle = '#63867b';
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
    const inZone = target && travel >= 0.8 && travel <= 1.12 && !state.attempted && state.winner === null;
    line(project(-1,side),project(1,side),inZone ? '#f0a500' : '#d4eae8',6);
    const [px, py] = project(target ? state.to : state.from, side);
    drawTennisPlayer(ctx, player, state.winner === null ? state.tick : Infinity, px, py + 24);
    const [bx, by] = project(lateral, depth);
    const height = 8 + 40 * Math.abs(Math.sin(Math.PI * (travel + 0.25)));
    ctx.fillStyle = '#193d44'; ctx.beginPath(); ctx.ellipse(bx,by,7,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffbb3c'; ctx.beginPath(); ctx.arc(bx,by-height,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#182f3a'; ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif';
    const center = 190 + side * 380;
    ctx.fillText(player.name, center, 95, 350);
    ctx.font = '16px sans-serif';
    ctx.fillText('Aim ' + ['left','centre','right'][player.lane + 1] + (player.smash ? ' · Smash ready' : ''),center,125);
    ctx.fillText(inZone ? 'Swing now' : '',center,445);
  });
}
