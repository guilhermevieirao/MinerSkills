import { describe, expect, it } from 'vitest';
import { HONEYPOT_FIELD, REPORT_REASONS, REPORT_STATUSES } from '../constants.js';
import {
  forumReplySchema,
  forumReportSchema,
  forumReportStatusSchema,
  forumTopicSchema,
} from './forum.js';

/** Caminho da primeira issue — o formulário mostra o erro nesse campo. */
function firstPath(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.success ? undefined : result.error?.issues[0]?.path.join('.');
}

describe('honeypot dos formulários do fórum', () => {
  const topic = { nickname: 'Visitante', title: 'Dúvida sobre o robô', body: 'Como funciona o braço?' };
  const reply = { nickname: 'Visitante', body: 'Também quero saber.' };

  it('aceita o campo-armadilha vazio ou preenchido (a rota decide)', () => {
    for (const trap of ['', 'http://spam']) {
      const parsedTopic = forumTopicSchema.safeParse({ ...topic, [HONEYPOT_FIELD]: trap });
      expect(parsedTopic.success).toBe(true);
      if (parsedTopic.success) expect(parsedTopic.data[HONEYPOT_FIELD]).toBe(trap);

      const parsedReply = forumReplySchema.safeParse({ ...reply, [HONEYPOT_FIELD]: trap });
      expect(parsedReply.success).toBe(true);
      if (parsedReply.success) expect(parsedReply.data[HONEYPOT_FIELD]).toBe(trap);
    }
  });

  it('campo-armadilha inválido não gera erro: vira "bot"', () => {
    for (const trap of ['x'.repeat(300), 42, null, ['a'], { a: 1 }]) {
      const parsedTopic = forumTopicSchema.safeParse({ ...topic, [HONEYPOT_FIELD]: trap });
      expect(parsedTopic.success).toBe(true);
      if (parsedTopic.success) expect(parsedTopic.data[HONEYPOT_FIELD]).toBe('bot');

      const parsedReply = forumReplySchema.safeParse({ ...reply, [HONEYPOT_FIELD]: trap });
      expect(parsedReply.success).toBe(true);
      if (parsedReply.success) expect(parsedReply.data[HONEYPOT_FIELD]).toBe('bot');
    }
  });

  it('sem o campo continua válido e sem valor', () => {
    const parsed = forumTopicSchema.safeParse(topic);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data[HONEYPOT_FIELD]).toBeUndefined();
  });
});

describe('forumReportSchema', () => {
  it('aceita todos os motivos, com ou sem detalhes', () => {
    for (const reason of REPORT_REASONS) {
      expect(forumReportSchema.safeParse({ reason }).success).toBe(true);
      expect(forumReportSchema.safeParse({ reason, details: null }).success).toBe(true);
      expect(forumReportSchema.safeParse({ reason, details: 'Propaganda de loja.' }).success).toBe(true);
    }
  });

  it('rejeita motivo desconhecido ou ausente', () => {
    expect(firstPath(forumReportSchema.safeParse({ reason: 'chato' }))).toBe('reason');
    expect(firstPath(forumReportSchema.safeParse({ details: 'sem motivo' }))).toBe('reason');
  });

  it('rejeita detalhes acima de 500 caracteres', () => {
    expect(
      forumReportSchema.safeParse({ reason: 'spam', details: 'a'.repeat(500) }).success,
    ).toBe(true);
    expect(
      firstPath(forumReportSchema.safeParse({ reason: 'spam', details: 'a'.repeat(501) })),
    ).toBe('details');
  });

  it('apara os detalhes', () => {
    const parsed = forumReportSchema.safeParse({ reason: 'outro', details: '  texto  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.details).toBe('texto');
  });

  it('campo-armadilha inválido vira "bot" também na denúncia', () => {
    const parsed = forumReportSchema.safeParse({ reason: 'spam', [HONEYPOT_FIELD]: 42 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data[HONEYPOT_FIELD]).toBe('bot');
  });
});

describe('forumReportStatusSchema', () => {
  it('aceita só os status conhecidos', () => {
    for (const status of REPORT_STATUSES) {
      expect(forumReportStatusSchema.safeParse({ status }).success).toBe(true);
    }
    expect(firstPath(forumReportStatusSchema.safeParse({ status: 'closed' }))).toBe('status');
    expect(forumReportStatusSchema.safeParse({}).success).toBe(false);
  });
});
