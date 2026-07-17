import { z } from 'zod';
import { SOCIAL_PLATFORMS } from '../constants.js';

export const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  label: z.string().min(1).max(80),
  url: z.string().min(1).max(400),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export type SocialLinkInput = z.infer<typeof socialLinkSchema>;

export interface SocialLinkDTO {
  id: string;
  platform: string;
  label: string;
  url: string;
  order: number;
  active: boolean;
}

// ─── Settings genéricas (chave/valor) ───────────────────────
export const settingSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.string().max(2000),
});
export type SettingInput = z.infer<typeof settingSchema>;
