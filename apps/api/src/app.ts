import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, uploadsRoot } from './config/env.js';
import { logger } from './lib/logger.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { ensureUploadDirs } from './middleware/upload.js';

// routers
import { authRouter } from './modules/auth/auth.routes.js';
import { mediaRouter } from './modules/media/media.routes.js';
import { dashboardAdminRouter } from './modules/dashboard/dashboard.routes.js';
import {
  contentPublicRouter,
  contentAdminRouter,
} from './modules/content/content.routes.js';
import { postsPublicRouter, postsAdminRouter } from './modules/posts/posts.routes.js';
import { galleryPublicRouter, galleryAdminRouter } from './modules/gallery/gallery.routes.js';
import { quizPublicRouter, quizAdminRouter } from './modules/quiz/quiz.routes.js';
import {
  memberTagsPublicRouter,
  memberTagsAdminRouter,
} from './modules/member-tags/member-tags.routes.js';
import {
  encyclopediaPublicRouter,
  encyclopediaAdminRouter,
} from './modules/encyclopedia/encyclopedia.routes.js';
import { forumPublicRouter, forumAdminRouter } from './modules/forum/forum.routes.js';
import { awardsPublicRouter, awardsAdminRouter } from './modules/awards/awards.routes.js';
import { agendaPublicRouter, agendaAdminRouter } from './modules/agenda/agenda.routes.js';
import {
  socialPublicRouter,
  socialAdminRouter,
  settingsPublicRouter,
  settingsAdminRouter,
} from './modules/social/social.routes.js';

export function createApp(): Express {
  ensureUploadDirs();
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // CSP é aplicado no front-end (nginx). Aqui a API serve só JSON + uploads.
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }));
  app.use(cookieParser());

  // Arquivos de upload — cache imutável + nosniff
  app.use(
    '/uploads',
    express.static(uploadsRoot, {
      immutable: true,
      maxAge: '30d',
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV, provider: env.DATABASE_PROVIDER });
  });

  // rate limit geral em /api (login/forum/quiz têm limites adicionais próprios)
  app.use('/api', generalLimiter);

  // ─── Rotas públicas ───────────────────────────────────────
  app.use('/api', contentPublicRouter); // /pages/:page, /timeline
  app.use('/api/posts', postsPublicRouter);
  app.use('/api/gallery', galleryPublicRouter);
  app.use('/api/quiz', quizPublicRouter);
  app.use('/api/member-tags', memberTagsPublicRouter);
  app.use('/api/encyclopedia', encyclopediaPublicRouter);
  app.use('/api/forum', forumPublicRouter);
  app.use('/api/awards', awardsPublicRouter);
  app.use('/api/agenda', agendaPublicRouter);
  app.use('/api/social-links', socialPublicRouter);
  app.use('/api/settings', settingsPublicRouter);

  // ─── Rotas admin ──────────────────────────────────────────
  app.use('/api/admin/auth', authRouter);
  app.use('/api/admin/media', mediaRouter);
  app.use('/api/admin/dashboard', dashboardAdminRouter);
  app.use('/api/admin', contentAdminRouter); // /content-blocks, /timeline
  app.use('/api/admin/posts', postsAdminRouter);
  app.use('/api/admin/gallery', galleryAdminRouter);
  app.use('/api/admin/quiz', quizAdminRouter);
  app.use('/api/admin/member-tags', memberTagsAdminRouter);
  app.use('/api/admin/encyclopedia', encyclopediaAdminRouter);
  app.use('/api/admin/forum', forumAdminRouter);
  app.use('/api/admin/awards', awardsAdminRouter);
  app.use('/api/admin/agenda', agendaAdminRouter);
  app.use('/api/admin/social-links', socialAdminRouter);
  app.use('/api/admin/settings', settingsAdminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
