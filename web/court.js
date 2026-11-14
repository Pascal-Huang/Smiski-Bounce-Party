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
    ctx.fillStyle = '#166a68';
    ctx.beginPath();
    for (const [i, point] of [[-1,0],[1,0],[1,1],[-1,1]].entries()) {
      if (i === 0) ctx.moveTo(...project(...point)); else ctx.lineTo(...project(...point));
    }
    ctx.closePath(); ctx.fill();
    line(project(0,0), project(0,1), '#c0ded5', 2);
    const [aimX, aimY] = project(direction * player.lane * 0.77, 1 - side);
    line([aimX - 9, aimY], [aimX + 9, aimY], '#ffce55', 5);
    const net = [-1,1].map(x => project(x,0.5));
    line(net[0],net[1],'#244551',12);
    const target = 1 - state.hitter === side;
    const inZone = target && travel >= 0.8 && travel <= 1.12 && !state.attempted;
    line(project(-1,side),project(1,side),inZone ? '#f0a500' : '#d4eae8',6);
    const [px, py] = project(target ? state.to : state.from, side);
    line([px - 17,py - 6],[px + 17,py - 6],'#ac3554',10);
    const [bx, by] = project(lateral, depth);
    const height = 8 + 40 * Math.abs(Math.sin(Math.PI * (travel + 0.25)));
    ctx.fillStyle = '#193d44'; ctx.beginPath(); ctx.ellipse(bx,by,7,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffbb3c'; ctx.beginPath(); ctx.arc(bx,by-height,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#182f3a'; ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif';
    const center = 190 + side * 380;
    ctx.fillText(player.name + ' · ' + player.score, center, 95, 350);
    ctx.font = '16px sans-serif';
    ctx.fillText('Aim ' + ['left','centre','right'][player.lane + 1] + (player.smash ? ' · Smash ready' : ''),center,125);
    ctx.fillText(inZone ? 'Swing now' : '',center,445);
  });
}
