import { z } from 'zod';
import { SPONSOR_TIERS } from '../constants.js';
import type { MediaAssetDTO } from './media.js';

export const sponsorSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(120),
  url: z.string().url('URL inválida').max(400).nullish(),
  tier: z.enum(SPONSOR_TIERS),
  logoId: z.string().nullish(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export type SponsorInput = z.infer<typeof sponsorSchema>;

export interface SponsorDTO {
  id: string;
  name: string;
  url: string | null;
  tier: string;
  order: number;
  active: boolean;
  logo: MediaAssetDTO | null;
}
