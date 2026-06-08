import { expect, test } from '@playwright/test'

test.describe('flujos principales de LifeOS', () => {
  test('crea una tarea desde la captura rapida', async ({ page }) => {
    await page.goto('/#/tasks')
    await expect(page.getByRole('heading', { name: 'Tareas', exact: true })).toBeVisible()

    const title = `Prueba E2E tarea ${Date.now()}`
    await page.getByPlaceholder(/Captura rapida/i).fill(title)
    await page.getByRole('button', { name: 'Agregar' }).click()

    await expect(page.getByText(title, { exact: true })).toBeVisible()
  })

  test('crea un habito en una categoria existente', async ({ page }) => {
    await page.goto('/#/habits')
    await expect(page.getByRole('heading', { name: /H.bitos/i })).toBeVisible()

    await page.getByRole('button', { name: 'Nuevo' }).click()
    const dialog = page.getByRole('dialog', { name: /Nuevo h.bito/i })
    const name = `Habito E2E ${Date.now()}`
    await dialog.getByPlaceholder('Ej: Meditar 10 min').fill(name)
    await dialog.getByRole('button', { name: 'Crear' }).click()

    await expect(page.getByText(name, { exact: true })).toBeVisible()
  })

  test('registra una pelicula en la biblioteca', async ({ page }) => {
    await page.goto('/#/media')
    await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible()

    await page.getByRole('button', { name: 'Nuevo' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nuevo' })
    const title = `Pelicula E2E ${Date.now()}`
    await dialog.getByRole('textbox').first().fill(title)
    await dialog.getByRole('button', { name: 'Crear' }).click()

    await expect(page.getByText(title, { exact: true })).toBeVisible()
  })
})
