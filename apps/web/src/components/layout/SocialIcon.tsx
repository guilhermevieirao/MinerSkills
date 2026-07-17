import {
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Facebook,
  Github,
  Mail,
  Globe,
  Music2,
  type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  x: Twitter,
  twitter: Twitter,
  facebook: Facebook,
  github: Github,
  tiktok: Music2,
  email: Mail,
  website: Globe,
  other: Globe,
};

export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = MAP[platform] ?? Globe;
  return <Icon className={className} aria-hidden />;
}
