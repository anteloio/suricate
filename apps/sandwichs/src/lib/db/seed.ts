import type { DB } from './client'
import { products, settings } from './schema'

type NewProduct = typeof products.$inferInsert

// Bruno's menu as of November 2026 (photo of the printed menu).
export const INITIAL_MENU: NewProduct[] = (
  [
    {
      category: 'sandwich',
      name: "L'incontournable Jambon beurre",
      description: 'Pain baguette tradition, jambon cuit à la coupe, beurre',
      priceCents: 350,
      formulaEligible: false,
    },
    {
      category: 'sandwich',
      name: 'Le Poulet Mayo',
      description:
        'Pain baguette tradition, émincé de poulet rôti, tomates, salade, sauce Suricate (mayonnaise maison)',
      priceCents: 550,
      formulaEligible: true,
    },
    {
      category: 'sandwich',
      name: 'Le Chèvre Miel',
      description: "Pain baguette tradition, jambon cru Serrano, chèvre, miel, salade, huile d'olive",
      priceCents: 550,
      formulaEligible: true,
    },
    {
      category: 'sandwich',
      name: 'Le Tomate Mozza',
      description: 'Pain baguette tradition, tomates, mozzarella, salade, pesto',
      priceCents: 550,
      formulaEligible: true,
    },
    { category: 'boisson', name: 'Eau minérale', description: '50 cl', priceCents: 150 },
    { category: 'boisson', name: 'Eau pétillante', description: '50 cl', priceCents: 150 },
    { category: 'boisson', name: 'Coca Cola', description: '33 cl', priceCents: 200 },
    { category: 'boisson', name: 'Coca Zéro', description: '33 cl', priceCents: 200 },
    { category: 'boisson', name: 'Ice tea', description: '33 cl, saveur pêche', priceCents: 200 },
    {
      category: 'boisson',
      name: 'Oasis',
      description: '33 cl',
      priceCents: 200,
      variants: ['Pomme', 'Cassis', 'Framboise'],
    },
    {
      category: 'dessert',
      name: 'Cookie maison',
      description: 'Fait maison',
      priceCents: 200,
      variants: ['Chocolat', 'Vanille'],
    },
  ] satisfies NewProduct[]
).map((p, position) => ({ ...p, position }))

/** Inserts the default settings row and the initial menu when the database is empty. */
export async function seedIfEmpty(db: DB) {
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing()
  const existing = await db.select({ id: products.id }).from(products).limit(1)
  if (existing.length === 0) {
    await db.insert(products).values(INITIAL_MENU)
    return true
  }
  return false
}
