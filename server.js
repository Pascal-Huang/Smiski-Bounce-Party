const http = require('node:http');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { networkInterfaces } = require('node:os');
const { randomUUID, randomInt } = require('node:crypto');
const { Server } = require('socket.io');
const QR = require('qrcode');

function addresses() {
  return Object.values(networkInterfaces()).flat()
    .filter(ip => ip && ip.family === 'IPv4' && !ip.internal).map(ip => ip.address);
}

function snapshot(room) {
  const players = room.players.filter(Boolean).map(({ name, socket }, index) => ({
    name, connected: Boolean(socket)
  }));
  const count = players.filter(p => p.connected).length;
  const games = ['Bumper Cars', 'Table Tennis', 'Pogo Race'].map(name => ({
    name, eligible: name === 'Table Tennis' ? count === 2 : count >= 2, implemented: true
  }));
  return { players, count, games };
}

function createLobby(grace = Number(process.env.REJOIN_GRACE_MS || 15000)) {
  const rooms = new Map();
  const server = process.env.TLS_CERT && process.env.TLS_KEY
    ? require('node:https').createServer({ cert: readFileSync(process.env.TLS_CERT), key: readFileSync(process.env.TLS_KEY) })
    : http.createServer();
  server.on('request', async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/qr') {
      const target = url.searchParams.get('url') || '';
      if (!/^https?:\/\/[\w.:[\]-]+\/c\/[A-Z]{4}$/.test(target)) {
        res.writeHead(400).end(); return;
      }
      try {
        const png = await QR.toBuffer(target, { width: 256 });
        res.writeHead(200, { 'Content-Type': 'image/png' }).end(png);
      } catch { res.writeHead(400).end(); }
      return;
    }
    const script = ['/app.js', '/sim.js', '/race.js', '/tennis.js', '/court.js', '/motion.js', '/pogo.js', '/pump.js'].includes(url.pathname);
    if (!script && !/^\/(?:play\/[A-Z]{4}|c\/[A-Za-z0-9]{4})?$/.test(url.pathname)) {
      res.writeHead(404).end('Page not found'); return;
    }
    res.writeHead(200, { 'Content-Type': script ? 'text/javascript' : 'text/html; charset=utf-8' });
    res.end(readFileSync(join(__dirname, 'web', script ? url.pathname.slice(1) : 'index.html')));
  });
  const io = new Server(server);
  io.on('connection', socket => {
    const broadcast = (code, room) => io.to(code).emit('roster', snapshot(room));
    socket.on('create', ack => {
      if (typeof ack !== 'function') return;
      let code;
      do { code = Array.from({ length: 4 }, () => String.fromCharCode(65 + randomInt(26))).join(''); }
      while (rooms.has(code));
      const token = randomUUID();
      rooms.set(code, { token, players: Array(4).fill(null) });
      ack({ code, token });
    });
    socket.on('enter', (data, ack) => {
      if (typeof ack !== 'function') return;
      const { code, token, host, nickname } = data || {};
      const room = rooms.get(code);
      if (!room) return ack({ error: 'Room not found. Check the code.' });
      if (socket.data.code) return ack({ error: 'Already joined.' });
      let player;
      if (host) {
        if (token !== room.token) return ack({ error: 'Host access required.' });
      } else {
        player = room.players.find(p => p && p.token === token);
        if (!player) {
          const index = room.players.indexOf(null);
          if (index < 0) return ack({ error: 'Room full' });
          player = { id: randomUUID(), token: randomUUID(), name: String(nickname || '').trim().slice(0, 24) || 'Player ' + (index + 1) };
          room.players[index] = player;
        }
        clearTimeout(player.timer);
        const previous = player.socket;
        player.socket = socket.id;
        if (previous) io.sockets.sockets.get(previous)?.disconnect(true);
      }
      socket.data.code = code;
      socket.join(code);
      ack({ token: player?.token, name: player?.name, id: player?.id, addresses: host ? addresses() : undefined });
      if (room.match) socket.emit('match', room.match);
      broadcast(code, room);
      socket.on('start', (name, reply) => {
        if (typeof reply !== 'function') return;
        const game = snapshot(room).games.find(g => g.name === name);
        if (!host) return reply({ error: 'Host access required.' });
        if (!game?.eligible) return reply({ error: 'Player count unavailable.' });
        if (!game.implemented) return reply({ error: 'Game not implemented.' });
        if (room.match?.phase === 'playing') return reply({ error: 'Round already running.' });
        room.driver = socket.id;
        room.match = { id: randomUUID(), game: name, driver: socket.id, phase: 'playing', players: room.players.flatMap((p, slot) =>
          p?.socket ? [{ slot, id: p.id, name: p.name }] : []) };
        io.to(code).emit('match', room.match);
        reply({ ok: true });
      });
      socket.on('input', data => {
        const match = room.match;
        const car = match?.players.find(p => p.id === player?.id);
        if (!car || match.phase !== 'playing' || data?.id !== match.id) return;
        if (match.game === 'Pogo Race') {
          if (data.pump === true && Number.isSafeInteger(data.round))
            io.to(room.driver).emit('pump', { id: match.id, slot: car.slot, round: data.round });
          return;
        }
        if (match.game === 'Table Tennis') {
          if (![-1, 0, 1].includes(data.lane)) return;
          io.to(room.driver).emit('stroke', { id: match.id, slot: car.slot, lane: data.lane, swing: data.swing === true });
          return;
        }
        if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
        const scale = Math.max(1, Math.hypot(data.x, data.y));
        io.to(room.driver).emit('drive', { slot: car.slot, x: data.x / scale, y: data.y / scale, boost: data.boost === true });
      });
      socket.on('frame', frame => {
        if (room.driver !== socket.id || room.match?.phase !== 'playing' || frame?.id !== room.match.id) return;
        const finished = room.match.game === 'Table Tennis'
          ? [0, 1].includes(frame.state?.winner) : room.match.game === 'Pogo Race'
            ? frame.state?.phase === 'finished' : frame.state?.tick === 3600;
        if (finished) {
          room.match.phase = 'results';
          room.match.result = frame.state;
          io.to(code).emit('match', room.match);
        } else socket.to(code).emit('frame', frame);
      });
      socket.on('lobby', () => {
        if (host && room.match?.phase === 'results') {
          room.match = null;
          io.to(code).emit('match', null);
        }
      });
      socket.on('disconnect', () => {
        if (room.driver === socket.id && room.match?.phase === 'playing') {
          room.match = null;
          io.to(code).emit('match', null);
        }
        if (!player || player.socket !== socket.id) return;
        const car = room.match?.players.find(p => p.id === player.id);
        if (car) io.to(room.driver).emit('drive', { slot: car.slot, x: 0, y: 0, reset: true });
        player.socket = null;
        broadcast(code, room);
        player.timer = setTimeout(() => {
          room.players[room.players.indexOf(player)] = null;
          broadcast(code, room);
        }, grace).unref();
      });
    });
  });
  return { server, io };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createLobby().server.listen(port, '0.0.0.0', () => {
    const scheme = process.env.TLS_CERT && process.env.TLS_KEY ? 'https://' : 'http://';
    for (const address of ['localhost', ...addresses()]) console.log('Open ' + scheme + address + ':' + port);
  });
}
module.exports = { createLobby };
