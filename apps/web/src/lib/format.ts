import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL ?? '/uploads';

/** Resolve URL de mídia da API (aceita path relativo `/uploads/...`). */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) return UPLOADS_URL === '/uploads' ? url : url.replace('/uploads', UPLOADS_URL);
  return url;
}

export function formatDate(iso: string, pattern = "d 'de' MMMM 'de' yyyy"): string {
  return format(new Date(iso), pattern, { locale: ptBR });
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "d MMM yyyy 'às' HH:mm", { locale: ptBR });
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true });
}

export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
