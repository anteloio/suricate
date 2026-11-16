import { defineConfig } from 'drizzle-kit'

// Only used to generate SQL migrations from src/lib/db/schema.ts (npm run db:generate).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
})
