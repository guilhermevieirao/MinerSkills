import { pino } from 'pino';
import { env, isProd } from '../config/env.js';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  transport: isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'password', '*.password'],
    remove: true,
  },
  base: { app: 'minerskills-api', env: env.NODE_ENV },
});
