import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

// Builds the Express app without listening or touching the database, so tests can mount
// it on an ephemeral port and server.js can own the lifecycle.
export const createApp = () => {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // Behind Heroku's router: trust it so req.ip is the real client (phase 7's rate limits key on it).
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
      credentials: false,
    }),
  );
  app.use(compression());
  // Log before the body parser so a rejected body (400 / 413) still leaves a request line.
  if (!isTest) app.use(morgan(isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
