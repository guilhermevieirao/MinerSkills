import {
  Bot,
  BookOpen,
  Box,
  Briefcase,
  Camera,
  CircuitBoard,
  Code2,
  Cpu,
  FlaskConical,
  Gamepad2,
  GraduationCap,
  Hammer,
  Heart,
  Lightbulb,
  Megaphone,
  Palette,
  PenTool,
  Presentation,
  Rocket,
  Ruler,
  Settings,
  Shield,
  Star,
  Swords,
  Trophy,
  User,
  Users,
  Video,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { MemberTagIcon } from '@minerskills/shared';

/**
 * Mapa nome-de-ícone → componente lucide. As chaves são exatamente os valores
 * de `MEMBER_TAG_ICONS` (packages/shared): o admin escolhe um nome ao criar
 * uma tag e o front resolve aqui. Ícone desconhecido/ausente cai em `User`.
 */
export const TAG_ICONS: Record<MemberTagIcon, LucideIcon> = {
  user: User,
  swords: Swords,
  'graduation-cap': GraduationCap,
  wrench: Wrench,
  'circuit-board': CircuitBoard,
  code: Code2,
  box: Box,
  megaphone: Megaphone,
  gamepad: Gamepad2,
  cpu: Cpu,
  lightbulb: Lightbulb,
  camera: Camera,
  rocket: Rocket,
  trophy: Trophy,
  shield: Shield,
  flask: FlaskConical,
  ruler: Ruler,
  hammer: Hammer,
  palette: Palette,
  briefcase: Briefcase,
  heart: Heart,
  star: Star,
  zap: Zap,
  settings: Settings,
  book: BookOpen,
  users: Users,
  wallet: Wallet,
  presentation: Presentation,
  video: Video,
  pen: PenTool,
};

export const ROBOT_ICON: LucideIcon = Bot;

export function resolveTagIcon(icon: string | null | undefined): LucideIcon {
  if (icon && icon in TAG_ICONS) return TAG_ICONS[icon as MemberTagIcon];
  return User;
}

/** Ícone de uma tag de membro (fallback: `User`). */
export function TagIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const Icon = resolveTagIcon(icon);
  return <Icon className={className} aria-hidden />;
}

/** Ícone de um registro da equipe: robô → `Bot`; membro → ícone da tag informada. */
export function EntryIcon({
  kind,
  icon,
  className,
}: {
  kind: string;
  icon?: string | null;
  className?: string;
}) {
  const Icon = kind === 'robot' ? ROBOT_ICON : resolveTagIcon(icon);
  return <Icon className={className} aria-hidden />;
}
