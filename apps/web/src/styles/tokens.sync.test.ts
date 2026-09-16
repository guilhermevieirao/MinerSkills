import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BP, mq } from '../lib/breakpoints';
import { DUR, EASE } from '../lib/motion';

/** Os valores do SCSS e do TS descrevem a mesma coisa: aqui um não anda sem o outro. */
const mixins = readFileSync(new URL('./_mixins.scss', import.meta.url), 'utf8');
const motion = readFileSync(new URL('./_motion.scss', import.meta.url), 'utf8');

describe('breakpoints', () => {
  it('BP espelha $bp-* de _mixins.scss', () => {
    for (const [name, px] of Object.entries(BP)) {
      expect(mixins, `$bp-${name}`).toMatch(new RegExp(`\\$bp-${name}:\\s*${px}px;`));
    }
    expect([...mixins.matchAll(/\$bp-(\w+):/g)].map((m) => m[1])).toEqual(
      Object.keys(BP),
    );
  });

  it('mq.below/from geram os mesmos intervalos dos mixins', () => {
    expect(mq.below('lg')).toBe('(max-width: 1023px)');
    expect(mq.from('md')).toBe('(min-width: 768px)');
  });
});

describe('movimento', () => {
  it('EASE espelha --ms-ease', () => {
    const css = /--ms-ease:\s*cubic-bezier\(([^)]+)\)/.exec(motion)?.[1];
    expect(css?.split(',').map((n) => Number(n.trim()))).toEqual([...EASE]);
  });

  it('DUR espelha --ms-dur-fast/--ms-dur/--ms-dur-slow (ms → s)', () => {
    const ms = (token: string) =>
      Number(new RegExp(`--${token}:\\s*(\\d+)ms;`).exec(motion)?.[1]);
    expect(ms('ms-dur-fast') / 1000).toBe(DUR.fast);
    expect(ms('ms-dur') / 1000).toBe(DUR.base);
    expect(ms('ms-dur-slow') / 1000).toBe(DUR.slow);
  });
});
