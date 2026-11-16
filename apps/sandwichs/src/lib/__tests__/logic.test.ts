import { describe, expect, it } from 'vitest'
import { priceCart, productionTotals, type MenuProduct } from '../cart'
import { DELIVERY_POINTS, findDeliveryPoint } from '../delivery-points'
import { formatEuros, parseEuros } from '../money'
import { addToHistory, MAX_HISTORY, parseHistory } from '../order-history'
import { deliveredText, deliveredWhatsAppLink, toE164 } from '../whatsapp'
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

const item = (productId: number, quantity = 1, variant?: string) => ({ productId, variant, quantity })

describe('priceCart', () => {
  it('applies the formule automatically to an eligible sandwich + a drink', () => {
    const r = priceCart([item(2), item(4, 1, 'Cassis')], menu, rules)
    expect(r.ok).toBe(true)
    expect(r.subtotalCents).toBe(750)
    expect(r.totalCents).toBe(650)
    expect(r.formulaDiscountCents).toBe(100)
    expect(r.formulaCount).toBe(1)
    expect(r.lines).toHaveLength(1)
    expect(r.lines[0]).toMatchObject({ kind: 'formule', label: 'Formule : Poulet Mayo + Oasis (Cassis)', quantity: 1 })
  })

  it('makes as many formules as possible and leaves the rest at their own price', () => {
    // 3 Poulet Mayo, 2 Oasis, 1 Eau: 3 formules (5,50 + 2,00 and 5,50 + 1,50 still beat 6,50)
    const r = priceCart([item(2, 3), item(4, 2, 'Pomme'), item(3), item(5, 1, 'Chocolat')], menu, rules)
    expect(r.formulaCount).toBe(3)
    expect(r.totalCents).toBe(3 * 650 + 200)
    expect(r.lines.map((l) => [l.label, l.quantity])).toEqual([
      ['Formule : Poulet Mayo + Oasis (Pomme)', 2],
      ['Formule : Poulet Mayo + Eau', 1],
      ['Cookie (Chocolat)', 1],
    ])
  })

  it('pairs the most expensive drinks first (best price) and never depends on the cart order', () => {
    const a = priceCart([item(3), item(2), item(4, 1, 'Pomme'), item(2)], menu, rules)
    const b = priceCart([item(2, 2), item(4, 1, 'Pomme'), item(3)], menu, rules)
    expect(a.totalCents).toBe(1300)
    expect(a.lines).toEqual(b.lines)
  })

  it('keeps the jambon beurre out of the formule', () => {
    const r = priceCart([item(1, 2), item(3)], menu, rules)
    expect(r.formulaCount).toBe(0)
    expect(r.totalCents).toBe(850)
  })

  it('never applies a formule that would cost more', () => {
    const r = priceCart([item(2), item(3)], menu, { ...rules, formulePriceCents: 800 })
    expect(r.formulaCount).toBe(0)
    expect(r.totalCents).toBe(700)
  })

  it('requires a valid flavor when the product has variants', () => {
    expect(priceCart([item(2), item(4)], menu, rules).ok).toBe(false)
    expect(priceCart([item(5, 4, 'Fraise')], menu, rules).ok).toBe(false)
    expect(priceCart([item(3, 5, 'Pomme')], menu, rules).ok).toBe(false)
  })

  it('enforces the minimum order', () => {
    const r = priceCart([item(1)], menu, rules)
    expect(r).toMatchObject({ ok: false, error: `Commande minimum : ${formatEuros(650)}.` })
    expect(priceCart([item(1, 2)], menu, rules).ok).toBe(true)
  })

  it('rejects inactive or unknown products and an empty cart', () => {
    expect(priceCart([], menu, rules).ok).toBe(false)
    expect(priceCart([item(6, 2)], menu, rules).ok).toBe(false)
    expect(priceCart([item(99, 2)], menu, rules).ok).toBe(false)
  })
})

describe('productionTotals', () => {
  it('counts sandwiches and drinks inside formules', () => {
    const r = priceCart([item(2, 3), item(4, 3, 'Pomme')], menu, rules)
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

describe('delivery points', () => {
  it('have unique ids and valid coordinates', () => {
    expect(new Set(DELIVERY_POINTS.map((p) => p.id)).size).toBe(DELIVERY_POINTS.length)
    for (const p of DELIVERY_POINTS) {
      expect(p.lat).toBeGreaterThan(43)
      expect(p.lat).toBeLessThan(44)
      expect(p.lon).toBeGreaterThan(6.5)
      expect(p.lon).toBeLessThan(7.5)
    }
    expect(findDeliveryPoint('ca-saint-laurent-du-var')?.address).toContain('Saint-Laurent-du-Var')
    expect(findDeliveryPoint('nope')).toBeUndefined()
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

describe('whatsapp message', () => {
  it('normalizes French numbers to E.164', () => {
    expect(toE164('06 12 34 56 78')).toBe('+33612345678')
    expect(toE164('07.12.34.56.78')).toBe('+33712345678')
    expect(toE164('+33 6 12 34 56 78')).toBe('+33612345678')
    expect(toE164('+33 06 12 34 56 78')).toBe('+33612345678')
    expect(toE164('0033612345678')).toBe('+33612345678')
    expect(toE164('+41 79 123 45 67')).toBe('+41791234567')
    expect(toE164('abc')).toBeNull()
  })
  it('writes a short delivery text', () => {
    const text = deliveredText({
      code: 'AB2CD',
      customerName: 'Marie',
      deliveryPointId: 'ca-saint-laurent-du-var',
      addressLabel: '',
    })
    expect(text).toContain('AB2CD')
    expect(text).toContain('Marie')
    expect(text).toContain('Crédit Agricole')
    expect(text.length).toBeLessThanOrEqual(160)
  })
  it('builds a wa.me link with the number in international format', () => {
    const order = { code: 'AB2CD', customerName: 'Marie', phone: '06 12 34 56 78', deliveryPointId: null, addressLabel: 'Ici' }
    const url = deliveredWhatsAppLink(order)!
    expect(url.startsWith('https://wa.me/33612345678?text=')).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(deliveredText(order))
    expect(deliveredWhatsAppLink({ ...order, phone: 'abc' })).toBeNull()
  })
})

describe('order history (Mes commandes)', () => {
  it('keeps only valid codes, newest first, without duplicates', () => {
    expect(parseHistory(null)).toEqual([])
    expect(parseHistory('not json')).toEqual([])
    expect(parseHistory('{"a":1}')).toEqual([])
    expect(parseHistory('["AB2CD","bad",42,"AB2CD","XY3ZW"]')).toEqual(['AB2CD', 'XY3ZW'])
    expect(addToHistory(['AB2CD', 'XY3ZW'], 'XY3ZW')).toEqual(['XY3ZW', 'AB2CD'])
    const many = Array.from({ length: MAX_HISTORY }, (_, i) => `A${String(i).padStart(4, '0')}`)
    expect(addToHistory(many, 'NEW22')).toHaveLength(MAX_HISTORY)
  })
})
