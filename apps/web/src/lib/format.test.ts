import { describe, expect, it } from 'vitest';
import { cx, formatDate, formatDuration, isWebUrl, mediaUrl } from './format';

describe('cx', () => {
  it('junta classes e descarta valores falsos', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
    expect(cx()).toBe('');
  });
});

describe('isWebUrl', () => {
  it('aceita só http(s) absoluto', () => {
    expect(isWebUrl('https://minerskills.com.br')).toBe(true);
    expect(isWebUrl('HTTP://x.y')).toBe(true);
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('data:text/html,oi')).toBe(false);
    expect(isWebUrl('/relativo')).toBe(false);
    expect(isWebUrl(null)).toBe(false);
  });
});

describe('mediaUrl', () => {
  it('mantém URLs absolutas e data: e devolve vazio para nulo', () => {
    expect(mediaUrl('https://cdn.x/a.webp')).toBe('https://cdn.x/a.webp');
    expect(mediaUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(mediaUrl(null)).toBe('');
    expect(mediaUrl(undefined)).toBe('');
  });
  it('preserva caminhos /uploads quando a base é a padrão', () => {
    expect(mediaUrl('/uploads/x.webp')).toBe('/uploads/x.webp');
  });
});

describe('formatDuration', () => {
  it('formata segundos e minutos', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(42_000)).toBe('42s');
    expect(formatDuration(90_500)).toBe('1m 31s');
  });
});

describe('formatDate', () => {
  it('formata em português com padrão customizável', () => {
    // meio-dia UTC: o mesmo dia em qualquer fuso entre -11 e +11
    expect(formatDate('2026-03-05T12:00:00.000Z', 'dd/MM/yyyy')).toBe('05/03/2026');
    expect(formatDate('2026-03-05T12:00:00.000Z')).toBe('5 de março de 2026');
  });
});
