import { z } from 'zod';
import { SETTING_KEYS, SOCIAL_PLATFORMS } from '../constants.js';

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

// ─── Settings (chave/valor; chaves em SETTING_DEFINITIONS) ──
export const settingSchema = z.object({
  key: z.enum(SETTING_KEYS),
  value: z.string().max(2000),
});
export type SettingInput = z.infer<typeof settingSchema>;

/** Salvamento em lote do formulário de Configurações (`PUT /api/admin/settings/bulk`). */
export const settingsBulkSchema = z.array(settingSchema).min(1).max(50);
export type SettingsBulkInput = z.infer<typeof settingsBulkSchema>;

export interface SettingDTO {
  key: string;
  value: string;
}
