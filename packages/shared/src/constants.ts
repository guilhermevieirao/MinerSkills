/**
 * Constantes compartilhadas entre front-end e back-end.
 *
 * Como o schema Prisma é restrito a escalares portáveis (sem enums, para
 * manter SQLite<->Postgres 100% compatível), estes arrays são a ÚNICA fonte
 * de verdade para valores "enum-like". São usados em:
 *   - validação zod (back-end)
 *   - selects/filtros (front-end)
 *   - seeder (dados fictícios)
 */

// ─── Enciclopédia ───────────────────────────────────────────
export const ENTRY_KINDS = ['member', 'robot'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const MEMBER_TAGS = [
  'competidor',
  'treinador',
  'mecanica',
  'eletronica',
  'programacao',
  'cad',
  'marketing',
  'piloto',
] as const;
export type MemberTag = (typeof MEMBER_TAGS)[number];

export const MEMBER_TAG_LABELS: Record<MemberTag, string> = {
  competidor: 'Competidor',
  treinador: 'Treinador',
  mecanica: 'Mecânica',
  eletronica: 'Eletrônica',
  programacao: 'Programação',
  cad: 'Cadista',
  marketing: 'Marketing',
  piloto: 'Piloto',
};

export const GENERATIONS = ['1', '2', '3'] as const;
export type Generation = (typeof GENERATIONS)[number];

export const GENERATION_LABELS: Record<Generation, string> = {
  '1': '1ª Geração',
  '2': '2ª Geração',
  '3': '3ª Geração',
};

// ─── Fórum ──────────────────────────────────────────────────
export const MODERATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

// ─── Mídia ──────────────────────────────────────────────────
export const MEDIA_KINDS = ['image', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

// ─── Agenda ─────────────────────────────────────────────────
export const AGENDA_KINDS = [
  'competicao',
  'evento',
  'processo-seletivo',
  'workshop',
  'outro',
] as const;
export type AgendaKind = (typeof AGENDA_KINDS)[number];

export const AGENDA_KIND_LABELS: Record<AgendaKind, string> = {
  competicao: 'Competição',
  evento: 'Evento',
  'processo-seletivo': 'Processo Seletivo',
  workshop: 'Workshop',
  outro: 'Outro',
};

// ─── Redes sociais ──────────────────────────────────────────
export const SOCIAL_PLATFORMS = [
  'instagram',
  'linkedin',
  'youtube',
  'tiktok',
  'x',
  'facebook',
  'github',
  'email',
  'website',
  'other',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// ─── Páginas com blocos de conteúdo editáveis ───────────────
export const EDITABLE_PAGES = ['landing', 'historia', 'como-entrar'] as const;
export type EditablePage = (typeof EDITABLE_PAGES)[number];

// ─── Metadados da equipe ────────────────────────────────────
export const TEAM = {
  number: 10019,
  name: 'MinerSkills',
  fullName: 'MinerSkills #10019',
  city: 'Belo Horizonte / Contagem',
  state: 'MG',
  country: 'Brasil',
  schools: ['Escola SESI General Onésimo Becker de Araújo', 'SENAI Euvaldo Lodi'],
  sponsor: 'FIEMG',
  program: 'FIRST Robotics Competition (FRC)',
} as const;
