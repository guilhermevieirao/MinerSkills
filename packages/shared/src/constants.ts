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

// ─── Equipe (membros & robôs) ───────────────────────────────
export const ENTRY_KINDS = ['member', 'robot'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/**
 * Ícones disponíveis para as tags de membro. Lista curada: o front-end mapeia
 * cada nome para um componente do lucide-react (ver
 * apps/web/src/features/encyclopedia/roleIcons.tsx). Nomes fora desta lista
 * são rejeitados pelo zod.
 */
export const MEMBER_TAG_ICONS = [
  'user',
  'swords',
  'graduation-cap',
  'wrench',
  'circuit-board',
  'code',
  'box',
  'megaphone',
  'gamepad',
  'cpu',
  'lightbulb',
  'camera',
  'rocket',
  'trophy',
  'shield',
  'flask',
  'ruler',
  'hammer',
  'palette',
  'briefcase',
  'heart',
  'star',
  'zap',
  'settings',
  'book',
  'users',
  'wallet',
  'presentation',
  'video',
  'pen',
] as const;
export type MemberTagIcon = (typeof MEMBER_TAG_ICONS)[number];

/**
 * Tags padrão de membro. As tags são gerenciadas pelo administrador (tabela
 * `MemberTag`); esta lista é usada APENAS pelo seeder e pela migration
 * inicial para popular o banco — em runtime, a fonte da verdade é a API
 * (`GET /api/member-tags`).
 */
export const DEFAULT_MEMBER_TAGS: ReadonlyArray<{
  key: string;
  label: string;
  icon: MemberTagIcon;
}> = [
  { key: 'competidor', label: 'Competidor', icon: 'swords' },
  { key: 'treinador', label: 'Treinador', icon: 'graduation-cap' },
  { key: 'mecanica', label: 'Mecânica', icon: 'wrench' },
  { key: 'eletronica', label: 'Eletrônica', icon: 'circuit-board' },
  { key: 'programacao', label: 'Programação', icon: 'code' },
  { key: 'cad', label: 'Cadista', icon: 'box' },
  { key: 'marketing', label: 'Marketing', icon: 'megaphone' },
  { key: 'piloto', label: 'Piloto', icon: 'gamepad' },
];

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

/** Motivos de denúncia de conteúdo do fórum. */
export const REPORT_REASONS = ['spam', 'ofensivo', 'off-topic', 'outro'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam ou propaganda',
  ofensivo: 'Conteúdo ofensivo',
  'off-topic': 'Fora do assunto',
  outro: 'Outro motivo',
};
export const REPORT_STATUSES = ['open', 'resolved'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

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

// ─── Patrocinadores ─────────────────────────────────────────
export const SPONSOR_TIERS = ['principal', 'apoio', 'parceiro'] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];
export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  principal: 'Patrocínio principal',
  apoio: 'Apoio institucional',
  parceiro: 'Parceiro',
};
/** Patrocinadores iniciais (seed, migration e backfill) — hoje fixos no rodapé. */
export const DEFAULT_SPONSORS: ReadonlyArray<{ name: string; tier: SponsorTier; url: string | null }> = [
  { name: 'FIEMG', tier: 'principal', url: 'https://www.fiemg.com.br' },
  { name: 'SESI', tier: 'apoio', url: 'https://www.fiemg.com.br/sesi' },
  { name: 'SENAI', tier: 'apoio', url: 'https://www.fiemg.com.br/senai' },
];

// ─── Contato / inscrição ────────────────────────────────────
export const CONTACT_KINDS = ['inscricao', 'contato'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];
export const CONTACT_KIND_LABELS: Record<ContactKind, string> = {
  inscricao: 'Inscrição',
  contato: 'Contato',
};
export const CONTACT_STATUSES = ['new', 'read', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: 'Nova',
  read: 'Lida',
  archived: 'Arquivada',
};
/** Campo-armadilha dos formulários públicos: preenchido só por robôs (a API descarta em silêncio). */
export const HONEYPOT_FIELD = 'website';

// ─── Configurações editáveis (Setting chave/valor) ──────────
/**
 * Chaves de configuração que o painel expõe em /admin/configuracoes. O model
 * `Setting` é genérico (key/value); esta lista dá forma ao formulário (rótulo,
 * dica, tipo de campo) e restringe as chaves aceitas pela API.
 * Valores booleanos são gravados como 'true' | 'false'.
 */
export const SETTING_DEFINITIONS = [
  {
    key: 'team_motto',
    label: 'Lema da equipe',
    hint: 'Frase curta exibida no rodapé do site.',
    type: 'text',
  },
  {
    key: 'city_line',
    label: 'Cidade / região',
    hint: 'Linha de localização exibida no rodapé (ex.: Belo Horizonte / Contagem — MG).',
    type: 'text',
  },
  {
    key: 'contact_email',
    label: 'E-mail de contato',
    hint: 'Exibido no rodapé e na página de contato.',
    type: 'email',
  },
  {
    key: 'applications_open',
    label: 'Inscrições abertas',
    hint: 'Quando ligado, a página Como Entrar exibe o formulário de inscrição.',
    type: 'boolean',
  },
  {
    key: 'applications_info',
    label: 'Aviso sobre inscrições',
    hint: 'Texto mostrado em Como Entrar enquanto as inscrições estão fechadas.',
    type: 'textarea',
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  hint: string;
  type: 'text' | 'textarea' | 'boolean' | 'email';
}>;
export type SettingKey = (typeof SETTING_DEFINITIONS)[number]['key'];
export type SettingFieldType = (typeof SETTING_DEFINITIONS)[number]['type'];
export const SETTING_KEYS = SETTING_DEFINITIONS.map((d) => d.key) as [SettingKey, ...SettingKey[]];

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
