const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { io: connect } = require('socket.io-client');
const { createLobby } = require('../server');
const Tennis = require('../web/tennis');

for (const enabled of [false, true]) {
  test('bot access and game flow with playtest ' + enabled, { timeout: 10000 }, async t => {
    const { server, io } = createLobby(300, enabled);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const clients = [];
    t.after(async () => { clients.forEach(s => s.close()); await io.close(); });
    async function client() {
      const s = connect('http://127.0.0.1:' + server.address().port, { transports: ['websocket'], forceNew: true });
      clients.push(s); await once(s, 'connect'); return s;
    }
    const host = await client();
    const { code, token } = await host.emitWithAck('create');
    const entered = await host.emitWithAck('enter', { host: true, code, token });
    assert.equal(entered.playtest, enabled);
    const phone = await client();
    const human = await phone.emitWithAck('enter', { code, nickname: 'Human' });
    assert.ok((await phone.emitWithAck('removePlayer', human.id)).error);
    assert.ok((await phone.emitWithAck('addBot')).error);
    if (!enabled) {
      assert.ok((await host.emitWithAck('addBot')).error);
      const removed = once(phone, 'removed');
      const roster = once(host, 'roster');
      assert.ok((await host.emitWithAck('removePlayer', human.id)).ok);
      await removed;
      assert.equal((await roster)[0].count, 0);
      return;
    }
    assert.ok((await host.emitWithAck('addBot')).ok);
    let update = once(host, 'match');
    assert.ok((await host.emitWithAck('start', 'Table Tennis')).ok);
    let [match] = await update;
    assert.equal(match.phase, 'calibration');
    assert.deepEqual(match.players.map(p => p.step), [0, 7]);
    update = once(host, 'match'); host.emit('startCalibration', match.id); await update;
    update = once(host, 'match'); host.emit('resetCalibration', match.id); [match] = await update;
    assert.deepEqual(match.players.map(p => p.step), [0, 7]);
    update = once(host, 'match');
    phone.emit('calibration', { id: match.id, step: 7 }); await update;
    [match] = await once(host, 'match'); assert.equal(match.phase, 'playing');
    assert.ok((await host.emitWithAck('addBot')).error);
    update = once(host, 'match'); host.emit('lobby'); await update;
    for (const game of ['Bumper Cars', 'Pogo Race']) {
      update = once(host, 'match'); await host.emitWithAck('start', game); [match] = await update;
      assert.equal(match.players.length, 2); assert.equal(match.players[1].bot, true);
      update = once(host, 'match'); host.emit('lobby'); await update;
    }
    await host.emitWithAck('addBot'); await host.emitWithAck('addBot');
    assert.equal((await host.emitWithAck('addBot')).error, 'Room full');
    assert.ok((await host.emitWithAck('removePlayer', match.players[1].id)).ok);
    assert.ok((await host.emitWithAck('addBot')).ok);
    assert.ok((await host.emitWithAck('removePlayer', match.players[1].id)).error);
  });
}

test('tennis bot makes one 75% decision per shot and returns through normal rules', () => {
  for (const roll of [0, 0.749, 0.75, 0.999]) {
    const s = Tennis.create([{ slot: 0 }, { slot: 2, bot: true }]);
    Object.assign(s, { pause: 0, flight: Math.ceil(s.duration * Tennis.beat) - 1 });
    let rolls = 0;
    const input = Tennis.botInputs(s, () => { rolls++; return roll; });
    Tennis.step(s, input);
    assert.equal(s.hitter, roll < 0.75 ? 1 : 0);
    for (let i = 0; i < 5; i++) {
      Tennis.step(s, Tennis.botInputs(s, () => { rolls++; return roll; }));
    }
    assert.equal(rolls, 1);
  }
});
