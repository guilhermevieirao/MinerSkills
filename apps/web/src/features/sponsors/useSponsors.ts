import { useQuery } from '@tanstack/react-query';
import {
  SPONSOR_TIERS,
  SPONSOR_TIER_LABELS,
  type SponsorDTO,
  type SponsorTier,
} from '@minerskills/shared';
import { api } from '../../lib/api';

/** Query key dos patrocinadores públicos — invalidada pelo painel após salvar. */
export const SPONSORS_QUERY_KEY = ['sponsors'] as const;

/** Patrocinadores ativos (`GET /api/sponsors`), já na ordem do painel. */
export function useSponsors() {
  return useQuery({
    queryKey: SPONSORS_QUERY_KEY,
    queryFn: () => api.get<SponsorDTO[]>('/sponsors'),
    staleTime: 5 * 60_000,
  });
}

export interface SponsorGroup {
  tier: SponsorTier;
  label: string;
  items: SponsorDTO[];
}

/**
 * Agrupa por nível na ordem principal → apoio → parceiro, mantendo dentro de
 * cada grupo a ordem da API. Níveis sem patrocinador ficam de fora; um valor
 * desconhecido de `tier` (dado antigo) cai em "parceiro" para não sumir.
 */
export function groupSponsorsByTier(sponsors: SponsorDTO[]): SponsorGroup[] {
  const isTier = (t: string): t is SponsorTier => (SPONSOR_TIERS as readonly string[]).includes(t);
  return SPONSOR_TIERS.map((tier) => ({
    tier,
    label: SPONSOR_TIER_LABELS[tier],
    items: sponsors.filter((s) => (isTier(s.tier) ? s.tier : 'parceiro') === tier),
  })).filter((g) => g.items.length > 0);
}
