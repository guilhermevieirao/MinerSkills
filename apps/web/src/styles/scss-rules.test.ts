import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regras do design system que nenhum linter verifica (não há stylelint):
 * 1. toda folha de estilo entra numa camada da cascata (@layer);
 * 2. cor só por token — hex/rgb()/hsl() literais só em _tokens.scss;
 * 3. classes com prefixo `ms-`.
 * A lista DEBT registra, com nome, os arquivos que ainda carregam cores literais
 * (páginas e painel são limpos nas fases R3/R5); um arquivo novo não pode entrar
 * nela, e um arquivo limpo precisa sair dela.
 */
const SRC = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return name.endsWith('.scss') ? [full] : [];
  });
}

const files = walk(SRC).map((f) => ({
  path: relative(SRC, f).split(sep).join('/'),
  css: readFileSync(f, 'utf8'),
}));
const stripComments = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** Arquivos que ainda têm cores literais — dívida a zerar, não licença para crescer. */
const DEBT = new Set<string>([
]);

const NO_LAYER = new Set([
  'styles/_layers.scss',
  'styles/_mixins.scss',
  'styles/main.scss',
]);
const CLASS_ALLOW = /^(ms-|tiptap|ProseMirror|is-)/;

describe('folhas de estilo', () => {
  it('existem e foram lidas', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('index.html abre com a mesma ordem de camadas de _layers.scss', () => {
    const order = /@layer [a-z, ]+;/;
    const layers = readFileSync(join(SRC, 'styles/_layers.scss'), 'utf8').match(
      order,
    )?.[0];
    const html = readFileSync(join(SRC, '../index.html'), 'utf8');
    expect(layers).toBeTruthy();
    const style = /<style>([^]*?)<\/style>/.exec(html)?.[1]?.trim() ?? '';
    expect(
      style.startsWith(layers!),
      'a ordem das camadas deve ser a 1ª regra do <style> inline',
    ).toBe(true);
  });

  it('toda folha entra numa camada da cascata', () => {
    for (const f of files) {
      if (NO_LAYER.has(f.path)) continue;
      expect(f.css, `${f.path} sem @layer`).toMatch(
        /@layer (reset|tokens|base|components|pages|utilities)\s*\{/,
      );
    }
  });

  it('cor só por token fora de _tokens.scss (DEBT lista as exceções conhecidas)', () => {
    const literal = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;
    for (const f of files) {
      if (f.path === 'styles/_tokens.scss') continue;
      const hits = stripComments(f.css)
        .split('\n')
        .filter((line) => literal.test(line));
      if (DEBT.has(f.path)) {
        expect(
          hits.length,
          `${f.path} está na DEBT mas não tem mais cor literal — remova da lista`,
        ).toBeGreaterThan(0);
      } else {
        expect(hits, `${f.path} usa cor literal`).toEqual([]);
      }
    }
  });

  it('classes usam o prefixo ms-', () => {
    for (const f of files) {
      const classes = [...stripComments(f.css).matchAll(/\.([A-Za-z][\w-]*)/g)]
        .map((m) => m[1]!)
        .filter((c) => !/^\d/.test(c) && !CLASS_ALLOW.test(c));
      expect(classes, `${f.path}: classes fora do prefixo`).toEqual([]);
    }
  });
});
