'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkPassword, endSession, requireAdmin, startSession } from '@/lib/auth'
import {
  CATEGORIES,
  db,
  deliveryPoints,
  ORDER_STATUSES,
  products,
  serviceDays,
  settings,
  type Category,
  type OrderStatus,
} from '@/lib/db'
import { deliveryPointSlug } from '@/lib/delivery-points'
import { parseEuros } from '@/lib/money'
import { setOrderStatus } from '@/lib/orders'

export type FormState = { error?: string; ok?: string } | undefined

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  if (!checkPassword(String(formData.get('password') ?? ''))) {
    return { error: 'Mot de passe incorrect.' }
  }
  await startSession()
  redirect('/admin')
}

export async function logout() {
  await endSession()
  redirect('/admin/login')
}

export async function toggleDay(formData: FormData) {
  await requireAdmin()
  const date = String(formData.get('date'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
  const d = await db()
  if (formData.get('open') === '1') {
    await d.insert(serviceDays).values({ date }).onConflictDoNothing()
  } else {
    await d.delete(serviceDays).where(eq(serviceDays.date, date))
  }
  revalidatePath('/admin', 'layout')
}

export async function changeOrderStatus(formData: FormData) {
  await requireAdmin()
  const status = String(formData.get('status')) as OrderStatus
  // Only SumUp's payment moves an order out of "a_payer"; Bruno never sets it.
  if (!ORDER_STATUSES.includes(status) || status === 'a_payer') return
  await setOrderStatus(Number(formData.get('orderId')), status)
  revalidatePath('/admin', 'layout')
}

function readProduct(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const category = String(formData.get('category')) as Category
  const priceCents = parseEuros(String(formData.get('price') ?? ''))
  if (!name) return { error: 'Le nom est obligatoire.' } as const
  if (!CATEGORIES.includes(category)) return { error: 'Catégorie invalide.' } as const
  if (priceCents === null) return { error: 'Prix invalide (ex : 5,50).' } as const
  const variants = String(formData.get('variants') ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  return {
    values: {
      name,
      category,
      priceCents,
      description: String(formData.get('description') ?? '').trim(),
      variants,
      active: formData.get('active') === 'on',
      position: Number(formData.get('position') ?? 0) || 0,
    },
  } as const
}

export async function saveProduct(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const parsed = readProduct(formData)
  if ('error' in parsed) return { error: parsed.error }
  const d = await db()
  const id = Number(formData.get('id'))
  if (id) await d.update(products).set(parsed.values).where(eq(products.id, id))
  else await d.insert(products).values(parsed.values)
  revalidatePath('/', 'layout')
  return { ok: id ? 'Enregistré' : 'Produit ajouté' }
}

export async function saveSettings(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const [h, m] = String(formData.get('cutoff') ?? '')
    .split(':')
    .map(Number)
  const formulePriceCents = parseEuros(String(formData.get('formulePrice') ?? ''))
  const deliveryWindow = String(formData.get('deliveryWindow') ?? '').trim()
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return { error: 'Heure limite invalide.' }
  }
  if (formulePriceCents === null) return { error: 'Prix invalide (ex : 6,50).' }
  if (!deliveryWindow) return { error: 'Indiquez le créneau de livraison.' }
  const d = await db()
  await d
    .update(settings)
    .set({ cutoffMinutes: h * 60 + m, formulePriceCents, deliveryWindow })
    .where(eq(settings.id, 1))
  revalidatePath('/', 'layout')
  return { ok: 'Réglages enregistrés' }
}

export async function saveDeliveryPoint(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  if (!name) return { error: 'Le nom est obligatoire.' }
  if (!address) return { error: 'L’adresse est obligatoire.' }
  const active = formData.get('active') === 'on'
  const d = await db()
  const id = String(formData.get('id') ?? '')
  if (id) {
    await d.update(deliveryPoints).set({ name, address, active }).where(eq(deliveryPoints.id, id))
  } else {
    // The id is stored on orders and never changes, even if the name is edited later.
    const base = deliveryPointSlug(name)
    for (let n = 1; ; n++) {
      const rows = await d
        .insert(deliveryPoints)
        .values({ id: n === 1 ? base : `${base}-${n}`, name, address, active: true })
        .onConflictDoNothing()
        .returning()
      if (rows.length) break
    }
  }
  revalidatePath('/', 'layout')
  return { ok: id ? 'Enregistré' : 'Point ajouté' }
}
