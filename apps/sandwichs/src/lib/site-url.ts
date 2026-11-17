/**
 * Public address of the customer site, the one encoded in the QR code. On Vercel it is the
 * production domain, so a preview or deployment URL never ends up on a flyer; locally it is the
 * address the app is being visited at.
 */
export function siteUrl(currentOrigin: string): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return production ? `https://${production}` : currentOrigin
}
