// Local playtest entry point. Public deployments continue to use npm start.
process.env.PLAYTEST_MODE = 'true';
const { createLobby } = require('./server');
const port = Number(process.env.PORT || 3000);
createLobby().server.listen(port, '0.0.0.0', () => {
  console.log('Playtest mode: http://localhost:' + port);
});
