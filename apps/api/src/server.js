import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

const PORT = Number(process.env.PORT || 4000);

const main = async () => {
  await connectDb(process.env.MONGODB_URI);
  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`[hooked-api] listening on http://localhost:${PORT}`);
  });

  // Heroku sends SIGTERM on every deploy, restart and daily dyno cycle, then SIGKILLs 30s
  // later. Stop accepting connections, let in-flight requests finish, drop idle keep-alive
  // sockets (which would otherwise hold close() open), and exit inside the window.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[hooked-api] ${signal} — draining in-flight requests`);
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => {
      console.error('[hooked-api] drain timed out — exiting');
      process.exit(0);
    }, 25000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

main().catch((err) => {
  console.error('[hooked-api] failed to start', err);
  process.exit(1);
});
