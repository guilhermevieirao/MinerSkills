import { useEffect } from 'react';

/**
 * Título, descrição, Open Graph, canonical e JSON-LD por página, sem biblioteca.
 * Roda no cliente (o site é um SPA): crawlers sociais leem o `index.html`
 * estático, cobertos pela pré-visualização servida pela API para bots; aqui
 * resolvemos o título da aba, o histórico, o compartilhamento manual e os
 * buscadores que executam JS.
 */
export interface DocumentHeadOptions {
  /** Título da página (sem o sufixo do site). */
  title: string;
  description?: string;
  /** Caminho canônico (ex.: '/blog/meu-post'); sem valor usa a URL atual. */
  canonicalPath?: string;
  /** URL absoluta ou relativa (/uploads/...) da imagem de compartilhamento. */
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  /** Bloco JSON-LD (schema.org) da página. */
  jsonLd?: Record<string, unknown> | null;
}

export const SITE_NAME = 'MinerSkills #10019';
const DEFAULT_DESCRIPTION =
  'MinerSkills #10019 — Equipe mineira de robótica da FIRST Robotics Competition (FRC). Escavamos conhecimento, construímos o futuro.';
const DEFAULT_IMAGE = '/icons/og-cover.png';
const MANAGED = 'data-ms-head';

export function siteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  return (configured && configured.trim()) || window.location.origin;
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl().replace(/\/+$/, '')}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function pageTitle(title: string): string {
  return title ? `${title} · ${SITE_NAME}` : SITE_NAME;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    if (el?.hasAttribute(MANAGED)) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED, '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    el.setAttribute(MANAGED, '');
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(data: Record<string, unknown> | null | undefined) {
  const id = 'ms-jsonld-page';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json'; // bloco de dados: a CSP script-src não se aplica
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Aplica as tags de <head> da página; volta ao padrão do site ao desmontar. */
export function useDocumentHead(opts: DocumentHeadOptions): void {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    canonicalPath,
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    jsonLd = null,
  } = opts;

  useEffect(() => {
    const url = absoluteUrl(canonicalPath ?? window.location.pathname);
    document.title = pageTitle(title);
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : undefined);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', pageTitle(title));
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image ? absoluteUrl(image) : undefined);
    upsertMeta('property', 'og:locale', 'pt_BR');
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', pageTitle(title));
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image ? absoluteUrl(image) : undefined);
    upsertLink('canonical', url);
    upsertJsonLd(jsonLd);
    // Sem cleanup por página: a próxima página sobrescreve tudo; o fallback é o index.html.
  }, [title, description, canonicalPath, image, type, noindex, jsonLd]);
}
