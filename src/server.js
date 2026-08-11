const app = require('./app');
require('dotenv').config();

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`
  ======================================================
  🚀 FinZap Agent Server rodando na porta ${port}
  ======================================================
  🌐 Dashboard Web:  http://localhost:${port}
  👥 Gestão Usuários: http://localhost:${port}/usuarios
  📩 Webhook Evolution API: http://localhost:${port}/webhook/evolution
  ======================================================
  `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Porta ${port} já está em uso. Tentando a porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Erro no servidor:', err);
    }
  });
}

startServer(DEFAULT_PORT);
