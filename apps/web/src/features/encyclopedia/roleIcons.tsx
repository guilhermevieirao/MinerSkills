import {
  Swords,
  GraduationCap,
  Wrench,
  CircuitBoard,
  Code2,
  Box,
  Megaphone,
  Gamepad2,
  Bot,
  User,
  type LucideIcon,
} from 'lucide-react';

export const ROLE_ICONS: Record<string, LucideIcon> = {
  competidor: Swords,
  treinador: GraduationCap,
  mecanica: Wrench,
  eletronica: CircuitBoard,
  programacao: Code2,
  cad: Box,
  marketing: Megaphone,
  piloto: Gamepad2,
  robot: Bot,
};

export function RoleIcon({ tag, className }: { tag: string; className?: string }) {
  const Icon = ROLE_ICONS[tag] ?? User;
  return <Icon className={className} aria-hidden />;
}
