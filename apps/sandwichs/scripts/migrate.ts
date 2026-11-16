// Applies SQL migrations from ./drizzle and seeds the menu on an empty database.
// Runs before `next build` (so on every Vercel deploy) and before `next dev`.
import path from 'node:path'
import { createDb } from '../src/lib/db/client'
import { seedIfEmpty } from '../src/lib/db/seed'

async function main() {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    console.warn('DATABASE_URL absent : migrations ignorées.')
    return
  }
  const db = await createDb()
  const migrationsFolder = path.join(process.cwd(), 'drizzle')
  if (process.env.DATABASE_URL) {
    const { migrate } = await import('drizzle-orm/neon-serverless/migrator')
    await migrate(db, { migrationsFolder })
  } else {
    const { migrate } = await import('drizzle-orm/pglite/migrator')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder })
  }
  const seeded = await seedIfEmpty(db)
  console.log(`Base de données à jour${seeded ? ' (menu initial ajouté)' : ''}.`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).$client.end?.()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).$client.close?.()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
