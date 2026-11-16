import type { NextConfig } from 'next'

// cacheComponents is deliberately off: every page reads fresh data from the database
// (orders, open days, menu), so page caching would only add complexity.
const nextConfig: NextConfig = {
  // PGlite (local dev database) loads its WebAssembly from disk and must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  // The dev "N" badge sits on top of the bottom bar's Retour button (and shows up in demo videos).
  devIndicators: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
