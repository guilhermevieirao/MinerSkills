import sanitizeHtml from 'sanitize-html';

/**
 * Sanitiza o HTML do editor do blog. Allowlist estrita: apenas formatação
 * de texto, listas, links e o iframe do youtube-nocookie (embeds).
 */
export function sanitizePostHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
      'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
      'hr', 'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https', 'http', 'data'] },
    allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.youtube.com'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
}

/**
 * Texto puro: remove qualquer HTML (fórum, apelidos, títulos, mensagens).
 * O sanitize-html devolve o texto re-escapado (`&` → `&amp;`, `<` → `&lt;`,
 * `>` → `&gt;`), mas o resultado vai para colunas de texto puro e o front
 * escapa ao renderizar — então essa única passada é desfeita aqui. A ordem
 * importa: `&amp;` por último, para um `&lt;` digitado (que o parser decodifica
 * e o sanitize re-escapa como `&amp;lt;`) voltar a `&lt;`, e não virar `<`.
 */
export function stripHtml(dirty: string): string {
  return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}
