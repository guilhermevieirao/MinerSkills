import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const common = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Muitas requisições. Tente mais tarde.' },
};

export const generalLimiter = rateLimit({ ...common, limit: env.RATE_LIMIT_MAX });

export const loginLimiter = rateLimit({
  ...common,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  skipSuccessfulRequests: true,
});

export const forumLimiter = rateLimit({ ...common, limit: env.RATE_LIMIT_FORUM_MAX });

export const quizLimiter = rateLimit({ ...common, limit: env.RATE_LIMIT_QUIZ_MAX });

/** Formulário público de contato/inscrição: poucos envios por IP bastam para um humano. */
export const contactLimiter = rateLimit({ ...common, limit: env.RATE_LIMIT_CONTACT_MAX });
