import { test, expect, type APIRequestContext } from '@playwright/test';
import { login, row, rowAction, confirmAction } from './helpers';

/** Subconjunto do `AgendaEventDTO` usado por estes testes. */
interface AgendaEvent {
  id: string;
  title: string;
  kind: string;
  startsAt: string;
  url: string | null;
  published: boolean;
}

/** Mesmo escape de texto do iCalendar (RFC 5545) que a API aplica. */
const escapeIcs = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');

/** Desfaz a dobra de linhas em 75 octetos para comparar o conteúdo lógico. */
const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, '');

async function publishedEvents(request: APIRequestContext): Promise<AgendaEvent[]> {
  const res = await request.get('/api/agenda');
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as AgendaEvent[];
}

test.describe('Agenda', () => {
  test('exporta a agenda completa em iCalendar', async ({ request }) => {
    const events = await publishedEvents(request);
    const sample = events[0];
    if (!sample) throw new Error('o seed precisa cadastrar ao menos um evento publicado');

    const res = await request.get('/api/agenda/ics');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/calendar');
    expect(res.headers()['content-disposition']).toContain('minerskills-agenda.ics');
    expect(res.headers()['cache-control']).toContain('max-age=300');

    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('END:VCALENDAR');
    expect(body).toContain('PRODID:-//MinerSkills//Agenda//PT');
    // linhas terminadas em CRLF, um VEVENT por evento publicado
    expect(body).toContain('\r\n');
    expect(body.match(/BEGIN:VEVENT/g)?.length).toBe(events.length);
    expect(unfold(body)).toContain(`SUMMARY:${escapeIcs(sample.title)}`);
  });

  test('exporta um evento individual e responde 404 para id desconhecido', async ({
    request,
  }) => {
    const events = await publishedEvents(request);
    const sample = events[0];
    if (!sample) throw new Error('o seed precisa cadastrar ao menos um evento publicado');

    const res = await request.get(`/api/agenda/${sample.id}/ics`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/calendar');
    expect(res.headers()['content-disposition']).toContain(`evento-${sample.id}.ics`);

    const body = await res.text();
    expect(body).toContain(`UID:${sample.id}@minerskills`);
    expect(body.match(/BEGIN:VEVENT/g)?.length).toBe(1);
    expect(unfold(body)).toContain(`SUMMARY:${escapeIcs(sample.title)}`);

    const missing = await request.get('/api/agenda/nao-existe/ics');
    expect(missing.status()).toBe(404);
  });

  test('cada evento oferece Google Calendar e download do .ics', async ({ page }) => {
    await page.goto('/agenda');
    const card = page.locator('.ms-event').first();
    await expect(card).toBeVisible();

    const google = card.getByRole('link', { name: /Google Calendar/ });
    await expect(google).toBeVisible();
    await expect(google).toHaveAttribute(
      'href',
      /calendar\.google\.com\/calendar\/render\?action=TEMPLATE/,
    );
    await expect(google).toHaveAttribute('target', '_blank');
    await expect(google).toHaveAttribute('rel', /noopener/);

    const ics = card.getByRole('link', { name: '.ics' });
    await expect(ics).toHaveAttribute('href', /\/api\/agenda\/[^/]+\/ics$/);
    await expect(ics).toHaveAttribute('download', '');

    // assinatura da agenda inteira
    const subscribe = page.getByRole('link', { name: /Assinar agenda/ });
    await expect(subscribe).toBeVisible();
    await expect(subscribe).toHaveAttribute('href', /\/api\/agenda\/ics$/);
  });

  test('a Home mostra o contador da próxima competição', async ({ page, request }) => {
    const now = Date.now();
    const next = (await publishedEvents(request))
      .filter((e) => e.kind === 'competicao' && new Date(e.startsAt).getTime() > now)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0];
    if (!next) {
      throw new Error(
        'o seed precisa cadastrar ao menos uma competição (kind "competicao") futura e publicada',
      );
    }

    await page.goto('/');
    const section = page.locator('.ms-next');
    await expect(section).toBeVisible();
    await expect(section.getByText('Próxima competição')).toBeVisible();
    await expect(section).toContainText(next.title);
    await expect(section.getByRole('link', { name: /Ver agenda/ })).toHaveAttribute(
      'href',
      '/agenda',
    );

    // o contador tique a cada segundo: o valor dos segundos muda sozinho
    const countdown = section.locator('.ms-countdown');
    await expect(countdown).toHaveAttribute('datetime', next.startsAt);
    const seconds = countdown.locator('.ms-countdown__value').last();
    const before = await seconds.textContent();
    await expect.poll(() => seconds.textContent(), { timeout: 7_000 }).not.toBe(before);
  });

  test('painel: link de inscrição vira botão Inscrever-se; despublicado some do .ics', async ({
    page,
  }) => {
    const stamp = `${Date.now().toString().slice(-6)}-${test.info().project.name}`;
    const title = `Evento com link ${stamp}`;
    const url = `https://www.firstinspires.org/?e2e=${stamp}`;

    await login(page);
    await page.goto('/admin/agenda');
    await page.getByRole('button', { name: /Novo evento/i }).click();
    await page.getByLabel('Título').fill(title);
    await page.getByLabel('Descrição').fill('Evento criado pelo teste de agenda.');
    await page.getByLabel('Início').fill('2031-06-01T10:00');
    await page.getByLabel('Link de inscrição ou detalhes (opcional)').fill(url);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Salvo.')).toBeVisible();

    // o site mostra o botão de inscrição apontando para o link cadastrado
    await page.goto('/agenda');
    const card = page.locator('.ms-event', { hasText: title });
    await expect(card).toBeVisible();
    const signup = card.getByRole('link', { name: /Inscrever-se/ });
    await expect(signup).toHaveAttribute('href', url);
    await expect(signup).toHaveAttribute('rel', /noopener/);

    // e o .ics do evento leva o mesmo link
    const created = (
      (await (await page.request.get('/api/admin/agenda')).json()) as AgendaEvent[]
    ).find((e) => e.title === title);
    if (!created)
      throw new Error('o evento recém-criado não apareceu na listagem do painel');
    const ics = await page.request.get(`/api/agenda/${created.id}/ics`);
    expect(ics.status()).toBe(200);
    expect(unfold(await ics.text())).toContain(`URL:${url}`);

    // despublicar: o evento deixa de ser exportado
    await page.goto('/admin/agenda');
    const linha = row(page, title);
    await rowAction(linha, 'Editar').click();
    await page.getByLabel('Publicado').uncheck();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Salvo.')).toBeVisible();
    await expect(linha).toContainText('Não');
    expect((await page.request.get(`/api/agenda/${created.id}/ics`)).status()).toBe(404);

    // limpa: remove o evento
    await rowAction(linha, 'Excluir').click();
    await confirmAction(page).click();
    await expect(page.getByText('Evento removido.')).toBeVisible();
    await expect(linha).toHaveCount(0);
  });
});
