// End-to-end smoke test in the locally installed Google Chrome (no browser download).
// Usage: start the app (npm run dev), then: BASE_URL=http://localhost:3000 ADMIN_PASSWORD=admin node e2e/smoke.mjs
// Opens the next delivery day as Bruno, places an order as a customer, then marks it delivered.
//
// RECORD_DIR=/some/dir  records a narrated demo video instead of running at full speed: slower
//                       actions, visible cursor and click highlights, a title card per scene. Each
//                       scene is saved as a .webm, then joined into RECORD_DIR/demo.mp4 (needs ffmpeg).
// SCREENSHOTS_DIR=/dir  saves full-page screenshots of the main screens.
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin'
const SHOTS = process.env.SCREENSHOTS_DIR
const RECORD = process.env.RECORD_DIR

const ADMIN_VIEWPORT = { width: 1000, height: 900 }
const PHONE_VIEWPORT = { width: 390, height: 844 }

const browser = await chromium.launch({ channel: 'chrome', headless: true, slowMo: RECORD ? 350 : 0 })
// Hides the Next.js dev-mode badge so it doesn't appear in recordings.
const hideDevBadge = (target) =>
  RECORD &&
  target.addInitScript(() =>
    document.addEventListener('DOMContentLoaded', () =>
      document.head.append(Object.assign(document.createElement('style'), { textContent: 'nextjs-portal{display:none!important}' })),
    ),
  )
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
const step = (msg) => console.log(`✓ ${msg}`)

// Types like a person when recording, fills instantly otherwise.
const type = async (locator, text) => {
  if (!RECORD) return locator.fill(text)
  await locator.fill('')
  await locator.pressSequentially(text, { delay: 45 })
}

// Runs one scene; when recording, films it into its own clip with a title card.
const clips = []
async function scene(page, title, description, fn) {
  if (!RECORD) return fn()
  const path = `${RECORD}/${String(clips.length + 1).padStart(2, '0')}.webm`
  clips.push(path)
  await page.screencast.start({ path, size: page.viewportSize() })
  // Cursor + highlight on each click/fill; no action titles (they show raw locators).
  await page.screencast.showActions({
    duration: 900,
    style: {
      highlight: 'outline: 3px solid #22c55e; border-radius: 10px; background: rgba(34, 197, 94, .12)',
      title: 'display: none',
    },
  })
  await page.screencast.showChapter(title, { description, duration: 2200 })
  await page.waitForTimeout(2400)
  await fn()
  await page.waitForTimeout(1500)
  await page.screencast.stop()
}

// Joins the clips into one mp4, centring each on a common canvas (phone and desktop sizes differ).
function joinClips() {
  const out = `${RECORD}/demo.mp4`
  const { width: W, height: H } = ADMIN_VIEWPORT
  const scaled = clips.map(
    (_, i) =>
      `[${i}:v]fps=25,scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0xe7e5e4,setsar=1[v${i}]`,
  )
  const filter = `${scaled.join(';')};${clips.map((_, i) => `[v${i}]`).join('')}concat=n=${clips.length}:v=1:a=0[out]`
  const args = ['-y', '-loglevel', 'error', ...clips.flatMap((c) => ['-i', c])]
  args.push('-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart', out)
  const res = spawnSync('ffmpeg', args, { stdio: 'inherit' })
  if (res.error || res.status !== 0) console.warn(`(ffmpeg unavailable or failed: clips are in ${RECORD})`)
  else console.log(`\n🎬 ${out}`)
}

try {
  if (RECORD) mkdirSync(RECORD, { recursive: true })

  // --- Bruno opens tomorrow ---
  const admin = await browser.newPage({ viewport: ADMIN_VIEWPORT })
  await hideDevBadge(admin)
  await admin.goto(`${BASE}/admin`)
  await admin.waitForURL('**/admin/login')
  await scene(admin, 'Bruno ouvre une journée', 'Connexion à /admin, puis ouverture de demain', async () => {
    await type(admin.locator('input[name=password]'), 'wrong')
    await admin.click('button:has-text("Se connecter")')
    await admin.getByText('Mot de passe incorrect.').waitFor()
    await type(admin.locator('input[name=password]'), PASSWORD)
    await admin.click('button:has-text("Se connecter")')
    await admin.waitForURL(`${BASE}/admin`)
    step('admin login')

    await admin.getByRole('link', { name: 'Jours' }).click()
    await admin.waitForURL('**/admin/jours')
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
  })

  // --- Customer orders on a phone ---
  const ctx = await browser.newContext({ viewport: PHONE_VIEWPORT, isMobile: true, hasTouch: true })
  await hideDevBadge(ctx)
  const shop = await ctx.newPage()
  await shop.goto(BASE)
  const totalIs = (text) => shop.locator('dl > div').filter({ hasText: /^Total/ }).getByText(text)
  const bar = shop.locator('.fixed.bottom-0')
  await scene(shop, 'Étape 1 : le menu', 'Il ajoute ses articles avec les + : la formule se fait toute seule', async () => {
    await shot(shop, 'client-menu')
    await shop.getByRole('button', { name: 'Ajouter Le Poulet Mayo', exact: true }).click()
    await shop.getByRole('button', { name: 'Ajouter Oasis Cassis', exact: true }).click()
    await shop.getByRole('button', { name: 'Ajouter Cookie maison Chocolat', exact: true }).click()
    await bar.getByText('3 articles · 8,50').waitFor()
    await bar.getByText('Formule appliquée').waitFor()
    if (RECORD) await shop.waitForTimeout(800)
    step('menu: formule applied automatically, 3 items = 8,50 €')
    await bar.getByRole('button', { name: 'Voir le panier' }).click()
  })

  await scene(shop, 'Étape 2 : le panier', 'Il vérifie sa commande et ajuste les quantités', async () => {
    await shop.waitForURL(/#panier$/)
    await shop.getByText('1 × Formule : Le Poulet Mayo + Oasis (Cassis)', { exact: false }).waitFor()
    await shop.getByText('Remise formule').waitFor()
    await totalIs('8,50').waitFor()
    step('cart review: formule line, discount, total 8,50 €')

    // A second sandwich alone is at its own price, until a drink joins it.
    await shop.getByRole('button', { name: 'Ajouter Le Poulet Mayo', exact: true }).click()
    await totalIs('14,00').waitFor()
    await shop.getByRole('button', { name: '+ Ajouter d’autres articles' }).click()
    await shop.getByRole('button', { name: 'Ajouter Eau minérale', exact: true }).click()
    await bar.getByRole('button', { name: 'Voir le panier' }).click()
    await shop.getByText('1 × Formule : Le Poulet Mayo + Eau minérale', { exact: false }).waitFor()
    await shop.getByText('Remise formule (× 2)').waitFor()
    await totalIs('15,00').waitFor()
    if (RECORD) await shop.waitForTimeout(1200)
    step('second formule with water: 15,00 €')

    // Removing the water drops back to one formule (and the water leaves the cart).
    await shop.getByRole('button', { name: 'Retirer Eau minérale', exact: true }).click()
    await totalIs('14,00').waitFor()
    await shop.getByRole('button', { name: '+ Ajouter d’autres articles' }).click()
    await shop.getByRole('button', { name: 'Ajouter Eau minérale', exact: true }).click()
    await bar.getByRole('button', { name: 'Voir le panier' }).click()
    await totalIs('15,00').waitFor()
    step('counters: − / + update the formules')
    await bar.getByRole('button', { name: 'Continuer' }).click()
  })

  let code
  await scene(shop, 'Étape 3 : la livraison', 'Prénom, téléphone, point de livraison, paiement', async () => {
    await shop.waitForURL(/#livraison$/)
    // The phone's back button goes back one step, and forward again.
    await shop.goBack()
    await totalIs('15,00').waitFor()
    await shop.goForward()
    await shop.getByLabel('Prénom').waitFor()
    step('back button returns to the cart')

    await type(shop.getByLabel('Prénom'), 'Marie')
    await type(shop.getByLabel('Téléphone'), '06 12 34 56 78')
    const point = shop.getByRole('radio', { name: /Crédit Agricole Saint-Laurent-du-Var/ })
    await point.check()
    if (!(await point.isChecked())) throw new Error('delivery point not selected')
    step('delivery point chosen from the list')
    await shop.getByRole('button', { name: 'Ticket Restaurant' }).click()
    await shot(shop, 'client-checkout')
    await bar.getByRole('button', { name: 'Commander' }).click()
    await shop.waitForURL(/\/commande\/[A-Z0-9]{5}\?nouvelle=1/, { timeout: 15000 })
    await shop.getByText('Votre commande est bien enregistrée').waitFor()
    code = shop.url().match(/commande\/([A-Z0-9]{5})/)[1]
    await shot(shop, 'client-confirmation')
    step(`order ${code} placed`)
  })

  await scene(shop, 'Mes commandes', 'Le téléphone du client garde ses commandes', async () => {
    await shop.getByRole('link', { name: 'Mes commandes' }).click()
    await shop.waitForURL(/\/mes-commandes$/)
    const mine = shop.getByRole('link').filter({ hasText: code })
    await mine.getByText('En préparation').waitFor()
    if (RECORD) await shop.waitForTimeout(1200)
    // Only the codes sent are returned; anything else is refused.
    const bad = await shop.request.post(`${BASE}/api/commandes/historique`, { data: { codes: ['*'] } })
    if (bad.status() !== 400) throw new Error(`history endpoint accepted a bad code (${bad.status()})`)
    step('order listed in "Mes commandes" as "En préparation"')
  })

  await scene(shop, 'Le client revient', 'Ses coordonnées sont déjà là : il n’a plus qu’à confirmer', async () => {
    await shop.goto(BASE)
    await shop.getByRole('button', { name: 'Ajouter Le Tomate Mozza', exact: true }).click()
    await shop.getByRole('button', { name: 'Ajouter Coca Cola', exact: true }).click()
    await bar.getByRole('button', { name: 'Voir le panier' }).click()
    await bar.getByRole('button', { name: 'Continuer' }).click()
    await shop.getByText('Marie · 06 12 34 56 78').waitFor()
    await shop.getByRole('button', { name: 'Modifier' }).waitFor()
    if ((await shop.getByLabel('Prénom').count()) !== 0) throw new Error('details should be prefilled')
    if (RECORD) await shop.waitForTimeout(1200)
    step('returning customer: delivery details prefilled, straight to confirm')
    // Leave the cart empty for the rest of the run.
    await shop.evaluate(() => localStorage.removeItem('suricate:panier'))
  })

  // --- Bruno sees it and sends it out ---
  await admin.goto(`${BASE}/admin`)
  // Stand-in for WhatsApp: shows the prepared message instead of leaving for wa.me.
  await admin.context().route('https://wa.me/**', (route) => {
    const url = new URL(route.request().url())
    const text = url.searchParams.get('text') ?? ''
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
    return route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<body style="font-family:sans-serif;padding:24px;background:#e5ddd5"><p>WhatsApp → +${esc(url.pathname.slice(1))}</p><p id="msg" style="background:#dcf8c6;padding:12px;border-radius:8px">${esc(text)}</p></body>`,
    })
  })
  await scene(admin, 'Bruno livre la commande', 'Il la marque « livrée » : WhatsApp s’ouvre avec le message prêt', async () => {
    await admin.getByRole('link', { name: 'Demain' }).click()
    // Scope to this run's order: the database may hold orders from earlier runs.
    const card = admin.locator('li.card').filter({ hasText: code })
    await card.getByText('Marie', { exact: true }).waitFor()
    await card.getByText(/Crédit Agricole Saint-Laurent-du-Var/).waitFor()
    await card.getByText('Formule : Le Poulet Mayo + Eau minérale').waitFor()
    await shot(admin, 'admin-commandes')
    await card.getByRole('button', { name: 'Livrée (WhatsApp au client)' }).click()
    await admin.waitForURL(/^https:\/\/wa\.me\/33612345678\?text=/, { timeout: 15000 })
    await admin.locator('#msg').getByText(`votre commande ${code} est arrivée`, { exact: false }).waitFor()
    if (RECORD) await admin.waitForTimeout(1500)
    step('WhatsApp opened with the message ready')
    await admin.goBack()
    const delivered = admin.locator('li.card').filter({ hasText: code })
    await delivered.getByRole('button', { name: 'Remettre à préparer' }).waitFor()
    step('order delivered by Bruno')
  })

  await shop.goto(`${BASE}/commande/${code}`)
  await scene(shop, 'Le client suit sa commande', 'Le statut passe à « Livrée »', async () => {
    await shop.getByText('Livrée', { exact: true }).waitFor()
    step('customer sees "Livrée"')
    await shop.goto(`${BASE}/mes-commandes`)
    await shop.getByRole('link').filter({ hasText: code }).getByText('Livrée').waitFor()
    step('"Mes commandes" shows it delivered')
  })
  console.log('\nAll good.')
} catch (err) {
  console.error('\n✗ Smoke test failed:', err.message)
  process.exitCode = 1
} finally {
  await browser.close()
  if (RECORD && clips.length) joinClips()
}
