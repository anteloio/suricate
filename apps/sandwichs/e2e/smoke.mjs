// End-to-end smoke test in the locally installed Google Chrome (no browser download). Everything
// runs in a phone viewport: the app is only used on phones (customers and Bruno alike).
// Usage: start the app (npm run dev), then: BASE_URL=http://localhost:3000 ADMIN_PASSWORD=admin node e2e/smoke.mjs
// Opens the next delivery day as Bruno, places an order as a customer, marks it delivered, then
// Bruno installs the admin app and shares the site's QR code.
//
// RECORD_DIR=/some/dir  films the scenes as narrated videos (slower actions, visible cursor and
//                       click highlights, a title card): one RECORD_DIR/NN-scene-title.mp4 per
//                       scene (needs ffmpeg).
// SCENES="9 qr"         films only the scenes whose number is listed or whose title contains one of
//                       the words. The other scenes still run, unfilmed: they set up the data.
// SCREENSHOTS_DIR=/dir  saves full-page screenshots of the main screens.
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin'
const SHOTS = process.env.SCREENSHOTS_DIR
const RECORD = process.env.RECORD_DIR

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }

const browser = await chromium.launch({ channel: 'chrome', headless: true, slowMo: RECORD ? 350 : 0 })
// Hides the Next.js dev-mode badge so it doesn't appear in recordings.
const hideDevBadge = (target) =>
  RECORD &&
  target.addInitScript(() =>
    document.addEventListener('DOMContentLoaded', () =>
      document.head.append(
        Object.assign(document.createElement('style'), { textContent: 'nextjs-portal{display:none!important}' })
      )
    )
  )
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
const step = (msg) => console.log(`✓ ${msg}`)

// True while a scene is being filmed: actions slow down so the video can be followed.
let filming = false

// Types like a person when filming, fills instantly otherwise.
const type = async (locator, text) => {
  if (!filming) return locator.fill(text)
  await locator.fill('')
  await locator.pressSequentially(text, { delay: 45 })
}

const plain = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
const WANTED = (process.env.SCENES ?? '').split(/[\s,]+/).filter(Boolean).map(plain)

// Runs one scene; when filming, records it as its own video with a title card.
let sceneCount = 0
async function scene(page, title, description, fn) {
  const number = ++sceneCount
  console.log(`\n${number}. ${title}`)
  const wanted = !WANTED.length || WANTED.some((w) => w === String(number) || plain(title).includes(w))
  if (!RECORD || !wanted) return fn()
  const slug = plain(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const base = `${RECORD}/${String(number).padStart(2, '0')}-${slug}`
  await page.screencast.start({ path: `${base}.webm`, size: page.viewportSize() })
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
  filming = true
  try {
    await fn()
  } finally {
    filming = false
  }
  await page.waitForTimeout(1500)
  await page.screencast.stop()
  toMp4(base)
}

// Converts a scene's .webm to an .mp4 that plays everywhere (chat, phones).
function toMp4(base) {
  const res = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', `${base}.webm`, '-vf', 'fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2']
      .concat(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', `${base}.mp4`]),
    { stdio: 'inherit' }
  )
  if (res.error || res.status !== 0) return console.warn(`(ffmpeg unavailable or failed: video is ${base}.webm)`)
  rmSync(`${base}.webm`)
  console.log(`🎬 ${base}.mp4`)
}

// Stand-in for the phone's share sheet (headless Chrome has none): shows what would be shared.
function fakeShareSheet() {
  navigator.canShare = (data) => Boolean(data?.files?.length)
  navigator.share = async ({ files, text }) => {
    const [file] = files
    window.__shared = { name: file.name, type: file.type, size: file.size, text }
    const sheet = Object.assign(document.createElement('div'), { id: 'share-sheet' })
    sheet.style.cssText =
      'position:fixed;inset:auto 0 0 0;z-index:99;background:#fff;border-radius:20px 20px 0 0;padding:20px;box-shadow:0 -8px 30px #0003;font:15px sans-serif;text-align:center'
    sheet.innerHTML = '<p style="font-weight:600;margin:0 0 12px">Partager via…</p>'
    const img = Object.assign(document.createElement('img'), { src: URL.createObjectURL(file) })
    img.style.cssText = 'width:200px;margin:auto;display:block;border:1px solid #ddd;border-radius:8px'
    const caption = Object.assign(document.createElement('p'), { textContent: text })
    caption.style.cssText = 'margin:12px 0;color:#555'
    const apps = Object.assign(document.createElement('p'), { textContent: 'WhatsApp · Messages · Gmail · Instagram' })
    sheet.append(img, caption, apps)
    document.body.append(sheet)
  }
}

try {
  if (RECORD) mkdirSync(RECORD, { recursive: true })

  // --- Bruno opens tomorrow ---
  const adminCtx = await browser.newContext(PHONE)
  await hideDevBadge(adminCtx)
  await adminCtx.addInitScript(fakeShareSheet)
  const admin = await adminCtx.newPage()
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
  const ctx = await browser.newContext(PHONE)
  await hideDevBadge(ctx)
  const shop = await ctx.newPage()
  await shop.goto(BASE)
  const totalIs = (text) =>
    shop
      .locator('dl > div')
      .filter({ hasText: /^Total/ })
      .getByText(text)
  const bar = shop.locator('.fixed.bottom-0')
  await scene(
    shop,
    'Étape 1 : le menu',
    'Il ajoute ses articles avec les + : la formule se fait toute seule',
    async () => {
      await shot(shop, 'client-menu')
      await shop.getByRole('button', { name: 'Ajouter Le Poulet Mayo', exact: true }).click()
      await shop.getByRole('button', { name: 'Ajouter Oasis Cassis', exact: true }).click()
      await shop.getByRole('button', { name: 'Ajouter Cookie maison Chocolat', exact: true }).click()
      await bar.getByText('3 articles · 8,50').waitFor()
      await bar.getByText('Formule appliquée').waitFor()
      if (filming) await shop.waitForTimeout(800)
      step('menu: formule applied automatically, 3 items = 8,50 €')
      await bar.getByRole('button', { name: 'Voir le panier' }).click()
    }
  )

  await scene(shop, 'Étape 2 : le panier', 'Il vérifie sa commande et ajuste les quantités', async () => {
    await shop.waitForURL(/#panier$/)
    await shop.getByText('1 × Formule : Le Poulet Mayo + Oasis (Cassis)', { exact: false }).waitFor()
    await shop.getByText('Remise formule').waitFor()
    await totalIs('8,50').waitFor()
    // The cart pill in the top bar is selected, like "Mes commandes" on its page.
    await shop.locator('header a[href="/#panier"][aria-current="page"]').waitFor()
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
    if (filming) await shop.waitForTimeout(1200)
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
  await scene(shop, 'Étape 3 : la livraison', 'Prénom, téléphone, point de livraison, puis paiement en ligne', async () => {
    await shop.waitForURL(/#livraison$/)
    // The phone's back button goes back one step, and forward again.
    await shop.goBack()
    await totalIs('15,00').waitFor()
    await shop.goForward()
    await shop.getByLabel('Prénom').waitFor()
    // So does the on-screen "Retour" button in the bottom bar.
    await bar.getByRole('button', { name: 'Retour' }).click()
    await totalIs('15,00').waitFor()
    await bar.getByRole('button', { name: 'Continuer' }).click()
    await shop.getByLabel('Prénom').waitFor()
    step('back buttons (phone and Retour) return to the cart')

    await type(shop.getByLabel('Prénom'), 'Marie')
    await type(shop.getByLabel('Téléphone'), '06 12 34 56 78')
    const point = shop.getByRole('radio', { name: /Crédit Agricole Saint-Laurent-du-Var/ })
    await point.check()
    if (!(await point.isChecked())) throw new Error('delivery point not selected')
    step('delivery point chosen from the list')
    await shop.getByText('sur la page sécurisée de SumUp').waitFor()
    await shot(shop, 'client-checkout')
    // Without SUMUP_API_KEY the payment is simulated: "Payer" leads straight back to the paid order.
    await bar.getByRole('button', { name: 'Payer' }).click()
    await shop.waitForURL(/\/commande\/[A-Z0-9]{5}\?nouvelle=1/, { timeout: 15000 })
    await shop.getByText('Paiement reçu, votre commande est bien enregistrée').waitFor()
    await shop.getByText('Payée en ligne').waitFor()
    code = shop.url().match(/commande\/([A-Z0-9]{5})/)[1]
    // Same status pill as in "Mes commandes".
    await shop.getByText('En préparation', { exact: true }).waitFor()
    await shot(shop, 'client-confirmation')
    step(`order ${code} placed`)
  })

  await scene(shop, 'Mes commandes', 'Le téléphone du client garde ses commandes', async () => {
    await shop.getByRole('link', { name: 'Mes commandes' }).click()
    await shop.waitForURL(/\/mes-commandes$/)
    const mine = shop.getByRole('link').filter({ hasText: code })
    await mine.getByText('En préparation').waitFor()
    if (filming) await shop.waitForTimeout(1200)
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
    // Same editable fields as the first time, already filled in from this phone.
    if ((await shop.getByLabel('Prénom').inputValue()) !== 'Marie') throw new Error('prénom should be prefilled')
    if ((await shop.getByLabel(/Téléphone/).inputValue()) !== '06 12 34 56 78')
      throw new Error('phone should be prefilled')
    if (!(await shop.getByRole('radio', { name: /Crédit Agricole/ }).isChecked()))
      throw new Error('point should be preselected')
    if ((await shop.getByRole('button', { name: 'Modifier' }).count()) !== 0)
      throw new Error('no summary card expected')
    if (filming) await shop.waitForTimeout(1200)
    step('returning customer: editable fields prefilled')
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
  await scene(
    admin,
    'Bruno livre la commande',
    'Il la marque « livrée » : WhatsApp s’ouvre avec le message prêt',
    async () => {
      await admin.getByRole('link', { name: 'Demain' }).click()
      // Scope to this run's order: the database may hold orders from earlier runs.
      const card = admin.locator('li.card').filter({ hasText: code })
      await card.getByText('Marie', { exact: true }).waitFor()
      await card.getByText(/Crédit Agricole Saint-Laurent-du-Var/).waitFor()
      await card.getByText('Formule : Le Poulet Mayo + Eau minérale').waitFor()
      await card.getByText('payé en ligne').waitFor()
      await shot(admin, 'admin-commandes')
      await card.getByRole('button', { name: 'Livrée (WhatsApp au client)' }).click()
      await admin.waitForURL(/^https:\/\/wa\.me\/33612345678\?text=/, { timeout: 15000 })
      await admin.locator('#msg').getByText(`votre commande ${code} est arrivée`, { exact: false }).waitFor()
      if (filming) await admin.waitForTimeout(1500)
      step('WhatsApp opened with the message ready')
      await admin.goBack()
      const delivered = admin.locator('li.card').filter({ hasText: code })
      await delivered.getByRole('button', { name: 'Remettre à préparer' }).waitFor()
      step('order delivered by Bruno')
    }
  )

  await shop.goto(`${BASE}/commande/${code}`)
  await scene(shop, 'Le client suit sa commande', 'Le statut passe à « Livrée »', async () => {
    await shop.getByText('Livrée', { exact: true }).waitFor()
    step('customer sees "Livrée"')
    await shop.goto(`${BASE}/mes-commandes`)
    await shop.getByRole('link').filter({ hasText: code }).getByText('Livrée').waitFor()
    step('"Mes commandes" shows it delivered')
  })

  // --- Bruno on his phone: installs the admin app, shares the QR code ---
  const qr = await fetch(`${BASE}/qr`)
  const qrBytes = new Uint8Array(await qr.arrayBuffer())
  if (qr.headers.get('content-type') !== 'image/png' || qrBytes[1] !== 0x50 || qrBytes.length < 1000)
    throw new Error('/qr should return a PNG')
  step('/qr returns a PNG')

  const bruno = admin
  await bruno.goto(`${BASE}/admin`)
  if (!(await bruno.locator('link[rel=manifest]').getAttribute('href'))?.includes('admin-app'))
    throw new Error('admin should link its web app manifest')
  await scene(bruno, 'L’appli sur le téléphone de Bruno', 'Il installe l’admin, puis partage l’affiche avec le QR code', async () => {
    // Chrome fires beforeinstallprompt when the app is installable; headless Chrome never does.
    await bruno.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true })
      event.prompt = async () => {
        window.__prompted = true
      }
      event.userChoice = Promise.resolve({ outcome: 'accepted' })
      window.dispatchEvent(event)
    })
    const banner = bruno.getByText('Installer l’appli sur ce téléphone')
    await banner.waitFor()
    await shot(bruno, 'admin-install-banner')
    await bruno.getByRole('button', { name: 'Installer', exact: true }).click()
    await banner.waitFor({ state: 'detached' })
    if (!(await bruno.evaluate(() => window.__prompted))) throw new Error('install prompt not shown')
    step('install banner opens the install prompt')

    await bruno.getByRole('link', { name: 'QR code' }).click()
    await bruno.waitForURL('**/admin/qr')
    const poster = bruno.getByRole('img', { name: /QR code vers/ })
    await poster.waitFor()
    await bruno.waitForFunction((img) => img.complete && img.naturalWidth === 1080, await poster.elementHandle())
    await shot(bruno, 'admin-qr')
    if (filming) await bruno.waitForTimeout(1200)
    await bruno.getByRole('button', { name: 'Partager' }).click()
    await bruno.locator('#share-sheet').waitFor()
    const shared = await bruno.evaluate(() => window.__shared)
    if (shared.type !== 'image/png' || shared.size < 10000 || !shared.text.includes(new URL(BASE).host))
      throw new Error(`unexpected share: ${JSON.stringify(shared)}`)
    if (filming) await bruno.waitForTimeout(2500)
    step('QR code shared from the admin')
  })

  // On a computer (no file sharing) the Partager button is hidden.
  const desk = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  await desk.addInitScript(() => {
    navigator.canShare = undefined
  })
  await desk.context().addCookies(await admin.context().cookies())
  await desk.goto(`${BASE}/admin/qr`)
  await desk.getByRole('img', { name: /QR code vers/ }).waitFor()
  if ((await desk.getByRole('button', { name: 'Partager' }).count()) !== 0)
    throw new Error('Partager should be hidden where files cannot be shared')
  step('Partager hidden on a computer')
  console.log('\nAll good.')
} catch (err) {
  console.error('\n✗ Smoke test failed:', err.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
