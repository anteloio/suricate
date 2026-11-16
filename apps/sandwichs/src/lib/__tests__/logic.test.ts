import { describe, expect, it } from 'vitest'
import { priceCart, productionTotals, type MenuProduct } from '../cart'
import { distanceKm, isInZone } from '../geo'
import { formatEuros, parseEuros } from '../money'
import { addDays, formatCutoff, orderableDays, parisNow } from '../time'

const menu: MenuProduct[] = [
  {
    id: 1,
    category: 'sandwich',
    name: 'Jambon beurre',
    description: '',
    priceCents: 350,
    formulaEligible: false,
    variants: [],
    active: true,
  },
  {
    id: 2,
    category: 'sandwich',
    name: 'Poulet Mayo',
    description: '',
    priceCents: 550,
    formulaEligible: true,
    variants: [],
    active: true,
  },
  {
    id: 3,
    category: 'boisson',
    name: 'Eau',
    description: '',
    priceCents: 150,
    formulaEligible: false,
    variants: [],
    active: true,
  },
  {
    id: 4,
    category: 'boisson',
    name: 'Oasis',
    description: '',
    priceCents: 200,
    formulaEligible: false,
    variants: ['Pomme', 'Cassis'],
    active: true,
  },
  {
    id: 5,
    category: 'dessert',
    name: 'Cookie',
    description: '',
    priceCents: 200,
    formulaEligible: false,
    variants: ['Chocolat'],
    active: true,
  },
  {
    id: 6,
    category: 'sandwich',
    name: 'Retiré',
    description: '',
    priceCents: 550,
    formulaEligible: true,
    variants: [],
    active: false,
  },
]
const rules = { formulePriceCents: 650, minOrderCents: 650 }

describe('priceCart', () => {
  it('prices a formule at the formule price, whatever the drink', () => {
    const r = priceCart(
      [{ type: 'formule', sandwichId: 2, drinkId: 4, drinkVariant: 'Cassis', quantity: 2 }],
      menu,
      rules
    )
    expect(r.ok).toBe(true)
    expect(r.totalCents).toBe(1300)
    expect(r.lines[0].label).toBe('Formule : Poulet Mayo + Oasis (Cassis)')
  })

  it('refuses the jambon beurre in a formule', () => {
    const r = priceCart([{ type: 'formule', sandwichId: 1, drinkId: 3, quantity: 1 }], menu, rules)
    expect(r).toMatchObject({ ok: false, error: 'Jambon beurre ne fait pas partie de la formule.' })
  })

  it('requires a valid flavor when the product has variants', () => {
    expect(priceCart([{ type: 'formule', sandwichId: 2, drinkId: 4, quantity: 1 }], menu, rules).ok).toBe(false)
    expect(priceCart([{ type: 'produit', productId: 5, variant: 'Fraise', quantity: 4 }], menu, rules).ok).toBe(false)
    expect(priceCart([{ type: 'produit', productId: 3, variant: 'Pomme', quantity: 5 }], menu, rules).ok).toBe(false)
  })

  it('enforces the minimum order', () => {
    const r = priceCart([{ type: 'produit', productId: 1, quantity: 1 }], menu, rules)
    expect(r).toMatchObject({ ok: false, error: 'Commande minimum : 6,50 €.' })
    expect(priceCart([{ type: 'produit', productId: 1, quantity: 2 }], menu, rules).ok).toBe(true)
  })

  it('rejects inactive or unknown products and an empty cart', () => {
    expect(priceCart([], menu, rules).ok).toBe(false)
    expect(priceCart([{ type: 'produit', productId: 6, quantity: 2 }], menu, rules).ok).toBe(false)
    expect(priceCart([{ type: 'produit', productId: 99, quantity: 2 }], menu, rules).ok).toBe(false)
  })

  it('a formule with water is cheaper than separately (5,50 + 1,50 = 7,00)', () => {
    expect(priceCart([{ type: 'formule', sandwichId: 2, drinkId: 3, quantity: 1 }], menu, rules).totalCents).toBe(650)
  })
})

describe('productionTotals', () => {
  it('counts sandwiches and drinks inside formules', () => {
    const r = priceCart(
      [
        { type: 'formule', sandwichId: 2, drinkId: 4, drinkVariant: 'Pomme', quantity: 2 },
        { type: 'produit', productId: 2, quantity: 1 },
        { type: 'produit', productId: 4, variant: 'Pomme', quantity: 1 },
      ],
      menu,
      rules
    )
    expect(productionTotals(r.lines)).toEqual([
      { name: 'Oasis (Pomme)', quantity: 3 },
      { name: 'Poulet Mayo', quantity: 3 },
    ])
  })
})

describe('time (Europe/Paris)', () => {
  it('converts UTC instants to Paris time, including DST', () => {
    expect(parisNow(new Date('2026-11-16T08:59:00Z'))).toEqual({ date: '2026-11-16', minutes: 9 * 60 + 59 }) // winter UTC+1
    expect(parisNow(new Date('2026-07-01T07:59:00Z'))).toEqual({ date: '2026-07-01', minutes: 9 * 60 + 59 }) // summer UTC+2
    expect(parisNow(new Date('2026-11-16T23:30:00Z')).date).toBe('2026-11-17')
  })

  it('closes today at the cutoff but keeps future days open', () => {
    const open = ['2026-11-16', '2026-11-18', '2026-11-10']
    expect(orderableDays(open, 600, { date: '2026-11-16', minutes: 599 })).toEqual(['2026-11-16', '2026-11-18'])
    expect(orderableDays(open, 600, { date: '2026-11-16', minutes: 600 })).toEqual(['2026-11-18'])
  })

  it('formats', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(formatCutoff(600)).toBe('10h')
    expect(formatCutoff(570)).toBe('9h30')
  })
})

describe('zone', () => {
  const zone = { zoneCenterLat: 43.615512, zoneCenterLon: 7.054762, zoneRadiusKm: 4 }
  it('accepts Sophia Antipolis and refuses Nice', () => {
    expect(isInZone({ lat: 43.6206, lon: 7.0712 }, zone)).toBe(true) // Les Templiers area
    expect(isInZone({ lat: 43.7031, lon: 7.2661 }, zone)).toBe(false) // Nice
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.19, 1)
  })
})

describe('money', () => {
  it('formats and parses euros', () => {
    expect(formatEuros(650)).toBe('6,50 €')
    expect(parseEuros('6,50')).toBe(650)
    expect(parseEuros('6.5 €')).toBe(650)
    expect(parseEuros('abc')).toBeNull()
  })
})
