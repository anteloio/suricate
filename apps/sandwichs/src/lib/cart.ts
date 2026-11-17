// Cart pricing shared by the browser (display) and the server (source of truth).
import { z } from 'zod'
import type { Product } from './db/schema'

export const MAX_QUANTITY = 20

// The customer only picks products and quantities; formules are found by the pricing below.
export const cartItemSchema = z.object({
  productId: z.number().int(),
  variant: z.string().nullish(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
})
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

export type PricingRules = { formulePriceCents: number }

type Totals = {
  /** What Bruno prepares and bills: formule lines first, then products bought separately. */
  lines: PricedLine[]
  /** Sum of the products at their own price. */
  subtotalCents: number
  /** Saved thanks to the formules found in the cart. */
  formulaDiscountCents: number
  formulaCount: number
  totalCents: number
}

export type PricedCart = ({ ok: true } | { ok: false; error: string }) & Totals

/** Stable identity of a cart item (product + flavor). */
export function cartItemKey(item: Pick<CartItem, 'productId' | 'variant'>): string {
  return `${item.productId}:${item.variant ?? ''}`
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

type Unit = { product: MenuProduct; variant: string | null }

/**
 * Prices the cart and applies the formule (one formula-eligible sandwich + one drink at
 * `formulePriceCents`) automatically, as many times as it saves money.
 *
 * Same greedy rule as the food truck (apps/foodtruck/src/models/order.js, getBestPossiblePrice):
 * repeatedly take the most expensive remaining item of each part of the formule and apply it
 * while it is cheaper than buying them separately. With a single kind of formule this is also the
 * best possible price: the k most expensive pairs maximize the savings for any number k of formules,
 * and each extra pair saves less than the previous one.
 * Runs in the browser (display) and on the server (source of truth); totals from the client are
 * never trusted.
 */
export function priceCart(items: CartItem[], menu: MenuProduct[], rules: PricingRules): PricedCart {
  const byId = new Map(menu.map((p) => [p.id, p]))
  const empty: Totals = { lines: [], subtotalCents: 0, formulaDiscountCents: 0, formulaCount: 0, totalCents: 0 }
  const fail = (error: string, totals: Totals = empty): PricedCart => ({ ok: false, error, ...totals })

  if (items.length === 0) return fail('Votre panier est vide.')

  const units: Unit[] = []
  for (const item of items) {
    const product = byId.get(item.productId)
    if (!product || !product.active) return fail("Un produit de votre panier n'est plus disponible.")
    const variant = checkVariant(product, item.variant)
    if (variant instanceof Error) return fail(variant.message)
    for (let i = 0; i < item.quantity; i++) units.push({ product, variant })
  }
  const subtotalCents = units.reduce((sum, u) => sum + u.product.priceCents, 0)

  // Most expensive first; ties broken by menu id so the result never depends on the cart order.
  const byPriceDesc = (a: Unit, b: Unit) => b.product.priceCents - a.product.priceCents || a.product.id - b.product.id
  const sandwiches = units
    .filter((u) => u.product.category === 'sandwich' && u.product.formulaEligible)
    .sort(byPriceDesc)
  const drinks = units.filter((u) => u.product.category === 'boisson').sort(byPriceDesc)

  const formules: { sandwich: Unit; drink: Unit }[] = []
  while (formules.length < Math.min(sandwiches.length, drinks.length)) {
    const sandwich = sandwiches[formules.length]
    const drink = drinks[formules.length]
    if (sandwich.product.priceCents + drink.product.priceCents <= rules.formulePriceCents) break
    formules.push({ sandwich, drink })
  }
  const inFormule = new Set<Unit>(formules.flatMap((f) => [f.sandwich, f.drink]))

  const lines: PricedLine[] = []
  const addLine = (key: (l: PricedLine) => boolean, line: Omit<PricedLine, 'quantity'>) => {
    const existing = lines.find(key)
    if (existing) existing.quantity++
    else lines.push({ ...line, quantity: 1 })
  }
  for (const { sandwich, drink } of formules) {
    addLine(
      (l) =>
        l.kind === 'formule' &&
        l.productId === sandwich.product.id &&
        l.drinkId === drink.product.id &&
        l.drinkVariant === drink.variant,
      {
        kind: 'formule',
        label: `Formule : ${sandwich.product.name} + ${withVariant(drink.product.name, drink.variant)}`,
        productId: sandwich.product.id,
        productName: sandwich.product.name,
        variant: null,
        drinkId: drink.product.id,
        drinkName: drink.product.name,
        drinkVariant: drink.variant,
        unitPriceCents: rules.formulePriceCents,
      }
    )
  }
  for (const unit of units) {
    if (inFormule.has(unit)) continue
    addLine((l) => l.kind === 'produit' && l.productId === unit.product.id && l.variant === unit.variant, {
      kind: 'produit',
      label: withVariant(unit.product.name, unit.variant),
      productId: unit.product.id,
      productName: unit.product.name,
      variant: unit.variant,
      drinkId: null,
      drinkName: null,
      drinkVariant: null,
      unitPriceCents: unit.product.priceCents,
    })
  }

  const totalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)
  const totals: Totals = {
    lines,
    subtotalCents,
    formulaDiscountCents: subtotalCents - totalCents,
    formulaCount: formules.length,
    totalCents,
  }
  return { ok: true, ...totals }
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
