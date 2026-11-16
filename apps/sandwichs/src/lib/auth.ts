import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { SESSION_COOKIE } from './auth-cookie'
export { SESSION_COOKIE }
const SESSION_DAYS = 30

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (s) return s
  if (process.env.NODE_ENV !== 'production') return 'dev-only-secret'
  throw new Error('SESSION_SECRET manquant.')
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function adminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD) || process.env.NODE_ENV !== 'production'
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV !== 'production' ? 'admin' : null)
  return expected !== null && safeEqual(input, expected)
}

export function createSessionToken(now = Date.now()): string {
  const expires = String(now + SESSION_DAYS * 24 * 60 * 60 * 1000)
  return `${expires}.${sign(expires)}`
}

export function isValidSessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature || Number(expires) < now) return false
  return safeEqual(signature, sign(expires))
}

export async function startSession() {
  ;(await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function endSession() {
  ;(await cookies()).delete(SESSION_COOKIE)
}

export async function isAdmin(): Promise<boolean> {
  return isValidSessionToken((await cookies()).get(SESSION_COOKIE)?.value)
}

/** Call at the top of every admin page and Server Action (the proxy is only a first check). */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login')
}
