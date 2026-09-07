import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from './helpers';

/** Subconjunto do `GalleryPhotoDTO` usado por estes testes. */
interface GalleryPhoto {
  id: string;
  caption: string | null;
}

async function fetchGallery(request: APIRequestContext): Promise<GalleryPhoto[]> {
  const resp = await request.get('/api/gallery');
  expect(resp.ok()).toBeTruthy();
  return (await resp.json()) as GalleryPhoto[];
}

/**
 * Os dois testes mexem no MESMO estado global (ordem e legendas das fotos do
 * seed) e o restauram ao final — por isso rodam em série. Os dois projetos
 * (desktop e mobile) rodam em paralelo, então cada um edita uma foto
 * diferente e a reordenação fica só no desktop.
 */
test.describe('Galeria (painel)', () => {
  test.describe.configure({ mode: 'serial' });

  test('edita a legenda de uma foto e ela aparece na galeria pública', async ({
    page,
    request,
    isMobile,
  }) => {
    const photos = await fetchGallery(request);
    test.skip(photos.length < 2, 'o seed precisa ter ao menos duas fotos na galeria');

    // desktop edita a primeira foto, mobile a última: os projetos não competem
    const target = isMobile ? photos.at(-1) : photos.at(0);
    if (!target) throw new Error('a galeria do seed está vazia');
    const stamp = Date.now().toString().slice(-6);
    const caption = `Legenda e2e ${stamp}`;

    await login(page);
    await page.goto('/admin/galeria');
    await expect(page.getByRole('heading', { name: 'Galeria', exact: true })).toBeVisible();

    const row = page.locator(`.ms-galadm__item[data-id="${target.id}"]`);
    await row.getByRole('button', { name: 'Editar legenda' }).click();
    await expect(page.getByRole('heading', { name: 'Editar legenda' })).toBeVisible();
    await page.getByLabel('Legenda', { exact: true }).fill(caption);
    // "exact" para não colidir com o botão "Salvar ordem" da lista atrás do modal
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();

    await expect(page.getByText('Legenda salva.')).toBeVisible();
    await expect(row.locator('.ms-galadm__caption')).toHaveText(caption);

    // a página pública reflete a mudança
    await page.goto('/galeria');
    await expect(page.locator('.ms-gallery__caption', { hasText: caption })).toBeVisible();

    // restaura a legenda original (vazio = sem legenda)
    await page.goto('/admin/galeria');
    await row.getByRole('button', { name: 'Editar legenda' }).click();
    await page.getByLabel('Legenda', { exact: true }).fill(target.caption ?? '');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Legenda salva.')).toBeVisible();

    const restored = await fetchGallery(request);
    expect(restored.find((p) => p.id === target.id)?.caption ?? null).toBe(target.caption);
  });

  test('reordena com os botões, salva e a API devolve a nova ordem', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(
      !!isMobile,
      'a ordem é um estado global: só o projeto desktop reordena, para não competir com o mobile',
    );
    const before = await fetchGallery(request);
    test.skip(before.length < 2, 'o seed precisa ter ao menos duas fotos na galeria');
    const [first, second, ...rest] = before;
    if (!first || !second) throw new Error('a galeria do seed precisa de duas fotos');
    const idsOf = (list: GalleryPhoto[]) => list.map((p) => p.id);

    await login(page);
    await page.goto('/admin/galeria');
    const items = page.locator('.ms-galadm__item');
    await expect(items).toHaveCount(before.length);
    // a lista do painel segue a mesma ordem da API pública
    await expect(items.first()).toHaveAttribute('data-id', first.id);

    const saveOrder = page.getByRole('button', { name: 'Salvar ordem' });
    await expect(saveOrder).toBeDisabled();

    // desce a primeira foto: ela troca de lugar com a segunda
    await items.first().getByRole('button', { name: 'Mover para baixo' }).click();
    await expect(items.first()).toHaveAttribute('data-id', second.id);
    await expect(saveOrder).toBeEnabled();

    const reorderDone = page.waitForResponse(
      (r) => r.url().includes('/api/admin/gallery/reorder') && r.request().method() === 'PUT',
    );
    await saveOrder.click();
    expect((await reorderDone).status()).toBe(204);
    await expect(page.getByText('Ordem salva.')).toBeVisible();

    const after = await fetchGallery(request);
    expect(idsOf(after)).toEqual([second.id, first.id, ...idsOf(rest)]);

    // restaura: sobe a foto original de volta ao topo e salva
    const moved = page.locator(`.ms-galadm__item[data-id="${first.id}"]`);
    await moved.getByRole('button', { name: 'Mover para cima' }).click();
    await expect(items.first()).toHaveAttribute('data-id', first.id);

    const restoreDone = page.waitForResponse(
      (r) => r.url().includes('/api/admin/gallery/reorder') && r.request().method() === 'PUT',
    );
    await saveOrder.click();
    expect((await restoreDone).status()).toBe(204);
    await expect(saveOrder).toBeDisabled();

    const restored = await fetchGallery(request);
    expect(idsOf(restored)).toEqual(idsOf(before));
  });
});
