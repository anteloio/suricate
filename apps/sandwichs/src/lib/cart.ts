// Cart pricing shared by the browser (display) and the server (source of truth).
import { z } from 'zod'
import type { Product } from './db/schema'
import { formatEuros } from './money'

export const MAX_QUANTITY = 20

export const cartItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('produit'),
    productId: z.number().int(),
    variant: z.string().nullish(),
    quantity: z.number().int().min(1).max(MAX_QUANTITY),
  }),
  z.object({
    type: z.literal('formule'),
    sandwichId: z.number().int(),
    drinkId: z.number().int(),
    drinkVariant: z.string().nullish(),
    quantity: z.number().int().min(1).max(MAX_QUANTITY),
  }),
])
export type CartItem = z.infer<typeof cartItemSchema>

export type MenuProduct = Pick<
  Product,
  'id' | 'category' | 'name' | 'description' | 'priceCents' | 'formulaEligible' | 'variants' | 'active'
>

export type PricedLine = {
  kind: 'produit' | 'formule'
  label: string
  productId: number
  productName: string
  variant: string | null
  drinkId: number | null
  drinkName: string | null
  drinkVariant: string | null
  quantity: number
  unitPriceCents: number
}

export type PricingRules = { formulePriceCents: number; minOrderCents: number }

export type PricedCart =
  | { ok: true; lines: PricedLine[]; totalCents: number }
  | { ok: false; error: string; lines: PricedLine[]; totalCents: number }

/** Stable identity of a cart item, used to merge identical additions. */
export function cartItemKey(item: CartItem): string {
  return item.type === 'produit'
    ? `p:${item.productId}:${item.variant ?? ''}`
    : `f:${item.sandwichId}:${item.drinkId}:${item.drinkVariant ?? ''}`
}

function withVariant(name: string, variant: string | null) {
  return variant ? `${name} (${variant})` : name
}

function checkVariant(product: MenuProduct, variant: string | null | undefined): string | null | Error {
  if (product.variants.length === 0) return variant ? new Error(`${product.name} n'a pas de choix.`) : null
  if (!variant || !product.variants.includes(variant)) {
    return new Error(`Choisissez une saveur pour ${product.name}.`)
  }
  return variant
}

export function priceCart(items: CartItem[], menu: MenuProduct[], rules: PricingRules): PricedCart {
  const byId = new Map(menu.map((p) => [p.id, p]))
  const lines: PricedLine[] = []
  const fail = (error: string): PricedCart => ({ ok: false, error, lines, totalCents: total(lines) })

  if (items.length === 0) return fail('Votre panier est vide.')

  for (const item of items) {
    if (item.type === 'produit') {
      const product = byId.get(item.productId)
      if (!product || !product.active) return fail("Un produit de votre panier n'est plus disponible.")
      const variant = checkVariant(product, item.variant)
      if (variant instanceof Error) return fail(variant.message)
      lines.push({
        kind: 'produit',
        label: withVariant(product.name, variant),
        productId: product.id,
        productName: product.name,
        variant,
        drinkId: null,
        drinkName: null,
        drinkVariant: null,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
      })
    } else {
      const sandwich = byId.get(item.sandwichId)
      const drink = byId.get(item.drinkId)
      if (!sandwich || !sandwich.active || !drink || !drink.active) {
        return fail("Un produit de votre formule n'est plus disponible.")
      }
      if (sandwich.category !== 'sandwich' || !sandwich.formulaEligible) {
        return fail(`${sandwich.name} ne fait pas partie de la formule.`)
      }
      if (drink.category !== 'boisson') return fail('La formule comprend un sandwich et une boisson.')
      const drinkVariant = checkVariant(drink, item.drinkVariant)
      if (drinkVariant instanceof Error) return fail(drinkVariant.message)
      lines.push({
        kind: 'formule',
        label: `Formule : ${sandwich.name} + ${withVariant(drink.name, drinkVariant)}`,
        productId: sandwich.id,
        productName: sandwich.name,
        variant: null,
        drinkId: drink.id,
        drinkName: drink.name,
        drinkVariant,
        quantity: item.quantity,
        unitPriceCents: rules.formulePriceCents,
      })
    }
  }

  const totalCents = total(lines)
  if (totalCents < rules.minOrderCents) {
    return fail(`Commande minimum : ${formatEuros(rules.minOrderCents)}.`)
  }
  return { ok: true, lines, totalCents }
}

function total(lines: PricedLine[]) {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)
}

export type ProductionCount = { name: string; quantity: number }

/** What Bruno has to prepare: sandwiches, drinks and desserts summed across lines (formules included). */
export function productionTotals(
  lines: Pick<PricedLine, 'productName' | 'variant' | 'drinkName' | 'drinkVariant' | 'quantity'>[]
): ProductionCount[] {
  const counts = new Map<string, number>()
  const add = (name: string, quantity: number) => counts.set(name, (counts.get(name) ?? 0) + quantity)
  for (const l of lines) {
    add(withVariant(l.productName, l.variant), l.quantity)
    if (l.drinkName) add(withVariant(l.drinkName, l.drinkVariant), l.quantity)
  }
  return [...counts.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'fr'))
}
