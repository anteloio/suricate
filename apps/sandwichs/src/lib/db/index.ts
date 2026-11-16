import 'server-only'
import { createDb, type DB } from './client'

// One connection per server process (survives hot reloads in dev).
const globalForDb = globalThis as unknown as { __sandwichsDb?: Promise<DB> }

export function db(): Promise<DB> {
  globalForDb.__sandwichsDb ??= createDb()
  return globalForDb.__sandwichsDb
}

export * from './schema'
