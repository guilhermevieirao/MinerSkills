import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Contraste WCAG 2.x dos pares realmente usados na interface. Lê `_tokens.scss`
 * como texto: qualquer troca de cor precisa continuar passando aqui.
 * Limites: texto normal ≥ 4,5:1; contorno de controle e ícone ≥ 3:1.
 */
const scss = readFileSync(new URL('./_tokens.scss', import.meta.url), 'utf8');

const tokens = new Map<string, string>();
for (const m of scss.matchAll(/--(ms-[\w-]+):\s*([^;]+);/g))
  tokens.set(m[1]!, m[2]!.trim());

/** Resolve `var(--ms-x)` até chegar num hex. */
function hex(name: string): string {
  let value: string | undefined = tokens.get(name);
  if (!value) throw new Error(`token --${name} não existe em _tokens.scss`);
  for (let i = 0; i < 5 && value.startsWith('var('); i++) {
    const inner: string | undefined = /var\(--(ms-[\w-]+)\)/.exec(value)?.[1];
    if (!inner) break;
    value = tokens.get(inner) ?? value;
  }
  if (!/^#[0-9a-f]{6}$/i.test(value))
    throw new Error(`--${name} não é um hex sólido: ${value}`);
  return value;
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['ms-bg', 'ms-surface', 'ms-surface-2', 'ms-surface-3', 'ms-field-bg'];
const AA_TEXT = 4.5;
const AA_UI = 3;

function expectPairs(fgs: string[], bgs: string[], min: number) {
  for (const fg of fgs) {
    for (const bg of bgs) {
      const r = ratio(hex(fg), hex(bg));
      expect(
        r,
        `--${fg} sobre --${bg} = ${r.toFixed(2)}:1 (mínimo ${min}:1)`,
      ).toBeGreaterThanOrEqual(min);
    }
  }
}

describe('tokens de texto', () => {
  it('texto principal, secundário e terciário passam AA em todas as superfícies', () => {
    expectPairs(['ms-text', 'ms-text-dim', 'ms-text-faint'], SURFACES, AA_TEXT);
  });

  it('cores semânticas usadas como texto passam AA sobre fundo, card e campo', () => {
    expectPairs(
      ['ms-green', 'ms-danger', 'ms-warning', 'ms-info'],
      ['ms-bg', 'ms-surface', 'ms-surface-2', 'ms-field-bg'],
      AA_TEXT,
    );
  });

  it('pódio do ranking legível sobre a página', () => {
    expectPairs(
      ['ms-podium-1', 'ms-podium-2', 'ms-podium-3'],
      ['ms-bg', 'ms-surface'],
      AA_TEXT,
    );
  });
});

describe('texto sobre verde', () => {
  const greens = ['ms-green', 'ms-green-hover', 'ms-green-strong'];
  it('--ms-on-green e --ms-on-green-soft passam AA sobre os verdes sólidos', () => {
    expectPairs(['ms-on-green', 'ms-on-green-soft'], greens, AA_TEXT);
  });

  it('e nas duas pontas do gradiente da marca', () => {
    const stops = [...(tokens.get('ms-gradient') ?? '').matchAll(/#[0-9a-f]{6}/gi)].map(
      (m) => m[0],
    );
    expect(stops.length).toBeGreaterThanOrEqual(2);
    for (const stop of stops) {
      for (const fg of ['ms-on-green', 'ms-on-green-soft']) {
        const r = ratio(hex(fg), stop);
        expect(r, `--${fg} sobre ${stop} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          AA_TEXT,
        );
      }
    }
  });
});

describe('contornos e ícones', () => {
  it('a borda de controle marca inputs, chips e botões outline (≥ 3:1)', () => {
    expectPairs(
      ['ms-border-control'],
      ['ms-bg', 'ms-surface', 'ms-surface-2', 'ms-field-bg'],
      AA_UI,
    );
  });

  it('o verde profundo funciona como acento (ícone, traço) sobre as superfícies', () => {
    expectPairs(['ms-green-deep'], SURFACES, AA_UI);
  });

  it('a rampa de superfícies é perceptível: cada degrau clareia o anterior', () => {
    const ramp = ['ms-bg', 'ms-surface', 'ms-surface-2', 'ms-surface-3'].map((t) =>
      luminance(hex(t)),
    );
    for (let i = 1; i < ramp.length; i++) {
      expect(ramp[i]!, `degrau ${i}`).toBeGreaterThan(ramp[i - 1]! * 1.15);
    }
    expect(luminance(hex('ms-field-bg'))).toBeGreaterThan(luminance(hex('ms-bg')));
    expect(luminance(hex('ms-field-bg'))).toBeLessThan(luminance(hex('ms-surface')));
  });
});
