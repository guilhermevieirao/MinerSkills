import { describe, expect, it } from 'vitest';
import { sanitizePostHtml, stripHtml } from './sanitize.js';

describe('sanitizePostHtml', () => {
  it('remove <script> e mantém a formatação permitida', () => {
    const out = sanitizePostHtml(
      '<p>Olá <strong>mundo</strong><script>alert(1)</script></p>',
    );
    expect(out).toBe('<p>Olá <strong>mundo</strong></p>');
  });

  it('remove atributos de evento e tags fora da allowlist', () => {
    const out = sanitizePostHtml('<p onclick="x()">a</p><div>b</div><style>p{}</style>');
    expect(out).toBe('<p>a</p>b');
  });

  it('permite iframe do youtube-nocookie', () => {
    const src = 'https://www.youtube-nocookie.com/embed/abc123';
    const out = sanitizePostHtml(`<iframe src="${src}" allowfullscreen></iframe>`);
    expect(out).toContain('<iframe');
    expect(out).toContain(`src="${src}"`);
  });

  it('neutraliza iframe de outro host (o src é descartado)', () => {
    // sanitize-html mantém a tag vazia, mas o embed de fora da allowlist some
    const out = sanitizePostHtml(
      '<p>antes</p><iframe src="https://evil.example.com/x"></iframe><p>depois</p>',
    );
    expect(out).not.toContain('evil.example.com');
    expect(out).not.toMatch(/<iframe[^>]*src=/);
  });

  it('links ganham rel="noopener noreferrer" e target="_blank"', () => {
    const out = sanitizePostHtml('<a href="https://example.com">site</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it('descarta href com esquema não permitido', () => {
    const out = sanitizePostHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });
});

describe('stripHtml', () => {
  it('remove qualquer tag e faz trim', () => {
    expect(stripHtml('  <b>Apelido</b> <script>x</script> ')).toBe('Apelido');
  });

  it('mantém texto puro intacto', () => {
    expect(stripHtml('Fulano de Tal')).toBe('Fulano de Tal');
  });

  it('não converte &, < e > em entidades HTML', () => {
    expect(stripHtml('Ana & Bia, x < y e y > z')).toBe('Ana & Bia, x < y e y > z');
    expect(stripHtml('Quero saber sobre C++ & Java')).toBe('Quero saber sobre C++ & Java');
  });

  it('remove a tag e mantém o texto em volta legível', () => {
    expect(stripHtml('a <b>&amp;</b> b')).toBe('a & b');
    // entidade digitada literalmente continua como texto, não vira tag
    expect(stripHtml('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;');
  });
});
