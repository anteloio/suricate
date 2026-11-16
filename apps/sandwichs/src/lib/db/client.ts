import type { NeonDatabase } from 'drizzle-orm/neon-serverless'
import path from 'node:path'
import * as schema from './schema'

export type DB = NeonDatabase<typeof schema>

/**
 * Production (Vercel): Neon Postgres via DATABASE_URL.
 * Local dev and tests: PGlite, an embedded Postgres stored in .data/ (no Docker needed).
 */
export async function createDb(options: { dataDir?: string } = {}): Promise<DB> {
  const url = process.env.DATABASE_URL
  if (url) {
    const { Pool } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-serverless')
    return drizzle({ client: new Pool({ connectionString: url }), schema })
  }
  if (process.env.VERCEL) {
    throw new Error('DATABASE_URL manquant : connecter la base Neon au projet Vercel.')
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dataDir = options.dataDir ?? process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), '.data', 'pglite')
  if (dataDir !== 'memory://') (await import('node:fs')).mkdirSync(dataDir, { recursive: true })
  const client = dataDir === 'memory://' ? new PGlite() : new PGlite(dataDir)
  return drizzle({ client, schema }) as unknown as DB
}
