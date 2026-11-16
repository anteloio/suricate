// End-to-end smoke test in the locally installed Google Chrome (no browser download).
// Usage: start the app (npm run dev), then: BASE_URL=http://localhost:3000 ADMIN_PASSWORD=admin node e2e/smoke.mjs
// Opens the next delivery day as Bruno, places an order as a customer, then dispatches it.
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin'
const SHOTS = process.env.SCREENSHOTS_DIR // optional: save screenshots there

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
const step = (msg) => console.log(`✓ ${msg}`)

try {
  // --- Bruno opens tomorrow ---
  const admin = await browser.newPage({ viewport: { width: 1000, height: 900 } })
  await admin.goto(`${BASE}/admin`)
  await admin.waitForURL('**/admin/login')
  await admin.fill('input[name=password]', 'wrong')
  await admin.click('button:has-text("Se connecter")')
  await admin.getByText('Mot de passe incorrect.').waitFor()
  await admin.fill('input[name=password]', PASSWORD)
  await admin.click('button:has-text("Se connecter")')
  await admin.waitForURL(`${BASE}/admin`)
  step('admin login')

  await admin.goto(`${BASE}/admin/jours`)
  const tomorrowRow = admin
    .locator('li')
    .filter({ has: admin.locator('form') })
    .nth(1)
  if ((await tomorrowRow.locator('button').innerText()).includes('Fermé')) {
    await tomorrowRow.locator('button').click()
    await tomorrowRow.getByText('Ouvert ✓').waitFor()
  }
  await shot(admin, 'admin-jours')
  step('tomorrow opened')

  // --- Customer orders on a phone ---
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const shop = await ctx.newPage()
  await shop.goto(BASE)
  await shot(shop, 'client-menu')
  await shop.getByRole('button', { name: 'Le Poulet Mayo', exact: true }).click()
  await shop.getByRole('button', { name: 'Oasis Cassis', exact: true }).click()
  await shop.getByRole('button', { name: 'Ajouter la formule' }).click()
  await shop.getByRole('button', { name: '+ Chocolat' }).click()
  await shop.locator('#panier').getByText('Formule : Le Poulet Mayo + Oasis (Cassis)').waitFor()
  await shop.locator('#panier').getByText('8,50').waitFor()
  step('cart: formule + cookie = 8,50 €')

  await shop.getByLabel('Nom et prénom').fill('Marie Test')
  await shop.getByLabel('Téléphone').fill('06 12 34 56 78')
  await shop.getByLabel('E-mail').fill('marie@example.com')
  await shop.getByLabel('Entreprise (facultatif)').fill('Amadeus')
  const address = shop.getByRole('combobox')
  await address.fill('Nice Promenade des Anglais')
  await shop.getByRole('listbox').getByText('hors zone').first().waitFor({ timeout: 15000 })
  step('address outside the zone is flagged')
  await address.fill('2004 route des Lucioles Biot')
  await shop.getByRole('listbox').getByRole('button').first().waitFor({ timeout: 15000 })
  await shop
    .getByRole('listbox')
    .getByRole('button', { name: /Lucioles/ })
    .first()
    .click()
  await shop.getByLabel('Bâtiment, étage, accueil… (facultatif)').fill('Bât. B, 2e étage')
  await shop.getByRole('button', { name: 'Ticket Restaurant' }).click()
  await shot(shop, 'client-checkout')
  await shop.getByRole('button', { name: 'Commander' }).click()
  await shop.waitForURL(/\/commande\/[A-Z0-9]{5}\?nouvelle=1/, { timeout: 15000 })
  await shop.getByText('Votre commande est bien enregistrée').waitFor()
  const code = shop.url().match(/commande\/([A-Z0-9]{5})/)[1]
  await shot(shop, 'client-confirmation')
  step(`order ${code} placed`)

  // --- Bruno sees it and sends it out ---
  await admin.goto(`${BASE}/admin`)
  await admin.getByRole('link', { name: 'Demain' }).click()
  await admin.getByText('Marie Test').waitFor()
  await admin.getByText('Le Poulet Mayo').first().waitFor()
  await shot(admin, 'admin-commandes')
  await admin.getByRole('button', { name: 'En route (e-mail au client)' }).click()
  await admin.getByText('En route', { exact: true }).waitFor()
  step('order dispatched by Bruno')

  await shop.goto(`${BASE}/commande/${code}`)
  await shop.getByText('En route', { exact: true }).waitFor()
  step('customer sees "En route"')
  console.log('\nAll good.')
} catch (err) {
  console.error('\n✗ Smoke test failed:', err.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
