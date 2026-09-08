import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  slugBase,
  uniqueEncyclopediaSlug,
  uniqueMemberTagKey,
  uniquePostSlug,
  uniqueSeasonSlug,
} from './slug.js';

// O prisma real importa env.js (que encerra o processo sem .env válido);
// aqui só interessa o findUnique de cada modelo.
const { postFind, entryFind, tagFind, seasonFind } = vi.hoisted(() => ({
  postFind: vi.fn(),
  entryFind: vi.fn(),
  tagFind: vi.fn(),
  seasonFind: vi.fn(),
}));

vi.mock('./prisma.js', () => ({
  prisma: {
    post: { findUnique: postFind },
    encyclopediaEntry: { findUnique: entryFind },
    memberTag: { findUnique: tagFind },
    season: { findUnique: seasonFind },
  },
}));

beforeEach(() => {
  postFind.mockReset();
  entryFind.mockReset();
  tagFind.mockReset();
  seasonFind.mockReset();
});

describe('slugBase', () => {
  it('remove acentos, baixa a caixa e troca espaços por hífen', () => {
    expect(slugBase('Programação & Eletrônica')).toBe('programacao-e-eletronica');
  });

  it('remove caracteres especiais', () => {
    expect(slugBase('Robô "Titan" (2025)!')).toBe('robo-titan-2025');
  });

  it('corta em max sem deixar hífen no final', () => {
    // "abcde-fghij" cortado em 6 seria "abcde-" → hífen final removido
    expect(slugBase('abcde fghij', 6)).toBe('abcde');
    expect(slugBase('abcde fghij', 8)).toBe('abcde-fg');
  });

  it('usa o fallback quando o resultado fica vazio', () => {
    expect(slugBase('!!!')).toBe('item');
    expect(slugBase('   ', 60, 'tag')).toBe('tag');
    expect(slugBase('')).toBe('item');
  });
});

describe('uniqueMemberTagKey', () => {
  it('retorna a chave base quando não há colisão', async () => {
    tagFind.mockResolvedValueOnce(null);
    await expect(uniqueMemberTagKey('Mecânica')).resolves.toBe('mecanica');
    expect(tagFind).toHaveBeenCalledTimes(1);
    expect(tagFind).toHaveBeenCalledWith({
      where: { key: 'mecanica' },
      select: { id: true },
    });
  });

  it('sufixa -2, -3… enquanto houver colisão', async () => {
    tagFind
      .mockResolvedValueOnce({ id: 'a' })
      .mockResolvedValueOnce({ id: 'b' })
      .mockResolvedValueOnce(null);
    await expect(uniqueMemberTagKey('Mecânica')).resolves.toBe('mecanica-3');
    expect(tagFind).toHaveBeenNthCalledWith(2, {
      where: { key: 'mecanica-2' },
      select: { id: true },
    });
  });

  it('limita a chave a 60 caracteres', async () => {
    tagFind.mockResolvedValueOnce(null);
    const key = await uniqueMemberTagKey('x'.repeat(100));
    expect(key).toHaveLength(60);
  });
});

describe('uniqueEncyclopediaSlug', () => {
  it('sufixa quando o slug já existe em outro registro', async () => {
    entryFind.mockResolvedValueOnce({ id: 'outro' }).mockResolvedValueOnce(null);
    await expect(uniqueEncyclopediaSlug('Ana Silva')).resolves.toBe('ana-silva-2');
  });

  it('ignora o próprio id (update mantém o slug)', async () => {
    entryFind.mockResolvedValueOnce({ id: 'me' });
    await expect(uniqueEncyclopediaSlug('Ana Silva', 'me')).resolves.toBe('ana-silva');
    expect(entryFind).toHaveBeenCalledTimes(1);
  });

  it('consulta apenas o modelo certo', async () => {
    entryFind.mockResolvedValueOnce(null);
    await uniqueEncyclopediaSlug('Ana Silva');
    expect(postFind).not.toHaveBeenCalled();
    expect(tagFind).not.toHaveBeenCalled();
  });
});

describe('uniquePostSlug', () => {
  it('consulta Post pelo slug e ignora o próprio id', async () => {
    postFind.mockResolvedValueOnce({ id: 'p1' });
    await expect(uniquePostSlug('Título do post', 'p1')).resolves.toBe('titulo-do-post');
    expect(postFind).toHaveBeenCalledWith({
      where: { slug: 'titulo-do-post' },
      select: { id: true },
    });
  });
});

describe('uniqueSeasonSlug', () => {
  it('consulta Season pelo slug e sufixa em colisão', async () => {
    seasonFind.mockResolvedValueOnce({ id: 'outra' }).mockResolvedValueOnce(null);
    await expect(uniqueSeasonSlug('Reefscape')).resolves.toBe('reefscape-2');
    expect(seasonFind).toHaveBeenNthCalledWith(1, {
      where: { slug: 'reefscape' },
      select: { id: true },
    });
    expect(entryFind).not.toHaveBeenCalled();
  });

  it('ignora o próprio id (renomear sem colisão mantém o slug)', async () => {
    seasonFind.mockResolvedValueOnce({ id: 's1' });
    await expect(uniqueSeasonSlug('Reefscape', 's1')).resolves.toBe('reefscape');
  });
});
