'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { cartItemKey, MAX_QUANTITY, priceCart, type CartItem, type MenuProduct, type PricingRules } from '@/lib/cart'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/db/schema'
import { isInZone, type Zone } from '@/lib/geo'
import { formatEuros } from '@/lib/money'
import { AddressInput, type Address } from './address-input'

type Day = { date: string; label: string }

type Customer = {
  customerName: string
  email: string
  phone: string
  company: string
  address: Address | null
  addressDetails: string
  paymentMethod: PaymentMethod | ''
}

const EMPTY_CUSTOMER: Customer = {
  customerName: '',
  email: '',
  phone: '',
  company: '',
  address: null,
  addressDetails: '',
  paymentMethod: '',
}

// Returning customers (mostly office workers) find their details and cart pre-filled.
const CUSTOMER_KEY = 'suricate:client'
const CART_KEY = 'suricate:panier'

export function OrderForm({
  menu,
  days,
  rules,
  zone,
  cutoff,
  deliveryWindow,
}: {
  menu: MenuProduct[]
  days: Day[]
  rules: PricingRules
  zone: Zone & { label: string }
  cutoff: string
  deliveryWindow: string
}) {
  const router = useRouter()
  const [serviceDate, setServiceDate] = useState(days[0].date)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER)
  const [notes, setNotes] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Restoring from localStorage must happen after hydration (the server has no localStorage).
  useEffect(() => {
    try {
      const savedCustomer = localStorage.getItem(CUSTOMER_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCustomer) setCustomer({ ...EMPTY_CUSTOMER, ...JSON.parse(savedCustomer) })
      const savedCart = localStorage.getItem(CART_KEY)
      if (savedCart) {
        const items = JSON.parse(savedCart) as CartItem[]
        // Drop items that no longer exist on the menu.
        setCart(items.filter((item) => priceCart([item], menu, { ...rules, minOrderCents: 0 }).ok))
      }
    } catch {
      // Corrupted storage: start fresh.
    }
    setLoaded(true)
  }, [menu, rules])

  useEffect(() => {
    if (loaded) localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart, loaded])

  const priced = useMemo(() => priceCart(cart, menu, rules), [cart, menu, rules])
  const itemCount = cart.reduce((n, i) => n + i.quantity, 0)

  const add = (item: CartItem) => {
    setError(null)
    setCart((current) => {
      const key = cartItemKey(item)
      const existing = current.find((i) => cartItemKey(i) === key)
      if (!existing) return [...current, item]
      return current.map((i) =>
        i === existing ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + item.quantity) } : i
      )
    })
  }

  const changeQuantity = (index: number, delta: number) =>
    setCart((current) =>
      current
        .map((item, i) => (i === index ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    )

  const update = <K extends keyof Customer>(key: K, value: Customer[K]) => setCustomer((c) => ({ ...c, [key]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!priced.ok) return setError(priced.error)
    if (!customer.address) return setError('Choisissez votre adresse dans la liste proposée.')
    if (!isInZone(customer.address, zone)) return setError(`Désolé, nous livrons uniquement à ${zone.label}.`)
    if (!customer.paymentMethod) return setError('Choisissez un moyen de paiement.')

    setSubmitting(true)
    try {
      const res = await fetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...customer, serviceDate, items: cart, notes, website }),
      })
      const result = (await res.json()) as { ok: true; code: string } | { ok: false; error: string }
      if (!result.ok) {
        setError(result.error)
        setSubmitting(false)
        return
      }
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer))
      localStorage.removeItem(CART_KEY)
      router.push(`/commande/${result.code}?nouvelle=1`)
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.')
      setSubmitting(false)
    }
  }

  const sandwiches = menu.filter((p) => p.category === 'sandwich')
  const drinks = menu.filter((p) => p.category === 'boisson')
  const desserts = menu.filter((p) => p.category === 'dessert')

  return (
    <form onSubmit={submit} className='mt-8 space-y-10'>
      {days.length > 1 ? (
        <section>
          <h2 className='section-title'>Jour de livraison</h2>
          <div className='mt-3 flex flex-wrap gap-2'>
            {days.map((d) => (
              <button
                key={d.date}
                type='button'
                onClick={() => setServiceDate(d.date)}
                className={`chip ${serviceDate === d.date ? 'chip-selected' : ''}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className='rounded-xl bg-stone-50 px-4 py-3 text-center text-neutral-700 ring-1 ring-neutral-200'>
          Livraison <strong className='lowercase'>{days[0].label}</strong>, {deliveryWindow}
        </p>
      )}

      <FormuleBuilder
        sandwiches={sandwiches.filter((s) => s.formulaEligible)}
        drinks={drinks}
        price={rules.formulePriceCents}
        onAdd={add}
      />

      <ProductSection title='Sandwichs' products={sandwiches} onAdd={add} />
      <ProductSection title='Boissons' products={drinks} onAdd={add} />
      <ProductSection title='Desserts' products={desserts} onAdd={add} />

      <section id='panier'>
        <h2 className='section-title'>Votre commande</h2>
        {cart.length === 0 ? (
          <p className='mt-3 text-neutral-500'>Votre panier est vide.</p>
        ) : (
          <ul className='mt-3 divide-y divide-neutral-200 rounded-2xl bg-white ring-1 ring-neutral-200'>
            {priced.lines.map((line, index) => (
              <li key={cartItemKey(cart[index])} className='flex items-center gap-3 px-4 py-3'>
                <div className='flex-1'>
                  <p className='font-medium'>{line.label}</p>
                  <p className='text-sm text-neutral-500'>{formatEuros(line.unitPriceCents)}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    className='qty'
                    aria-label='Retirer un'
                    onClick={() => changeQuantity(index, -1)}
                  >
                    −
                  </button>
                  <span className='w-5 text-center tabular-nums'>{line.quantity}</span>
                  <button
                    type='button'
                    className='qty'
                    aria-label='Ajouter un'
                    onClick={() => changeQuantity(index, 1)}
                  >
                    +
                  </button>
                </div>
                <p className='w-20 text-right tabular-nums'>{formatEuros(line.quantity * line.unitPriceCents)}</p>
              </li>
            ))}
            <li className='flex justify-between px-4 py-3 text-lg font-semibold'>
              <span>Total</span>
              <span className='tabular-nums'>{formatEuros(priced.totalCents)}</span>
            </li>
          </ul>
        )}
        {cart.length > 0 && !priced.ok && <p className='mt-2 text-sm text-amber-700'>{priced.error}</p>}
      </section>

      {cart.length > 0 && (
        <section className='space-y-4'>
          <h2 className='section-title'>Livraison</h2>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='Nom et prénom'>
              <input
                className='input'
                required
                autoComplete='name'
                value={customer.customerName}
                onChange={(e) => update('customerName', e.target.value)}
              />
            </Field>
            <Field label='Téléphone'>
              <input
                className='input'
                required
                type='tel'
                autoComplete='tel'
                value={customer.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </Field>
            <Field label='E-mail' hint='Pour la confirmation, puis quand la commande est livrée.'>
              <input
                className='input'
                required
                type='email'
                autoComplete='email'
                value={customer.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
            <Field label='Entreprise (facultatif)'>
              <input
                className='input'
                autoComplete='organization'
                value={customer.company}
                onChange={(e) => update('company', e.target.value)}
              />
            </Field>
          </div>
          <Field label='Adresse de livraison'>
            <AddressInput
              key={loaded ? 'restored' : 'initial'}
              value={customer.address}
              onChange={(a) => update('address', a)}
              zone={zone}
            />
          </Field>
          <Field label='Bâtiment, étage, accueil… (facultatif)'>
            <input
              className='input'
              value={customer.addressDetails}
              onChange={(e) => update('addressDetails', e.target.value)}
            />
          </Field>
          <fieldset>
            <legend className='label'>Paiement à la livraison</legend>
            <div className='mt-2 flex flex-wrap gap-2'>
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type='button'
                  onClick={() => update('paymentMethod', m)}
                  className={`chip ${customer.paymentMethod === m ? 'chip-selected' : ''}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label='Un mot pour Bruno ? (facultatif)'>
            <textarea
              className='input min-h-20'
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <input
            type='text'
            name='website'
            tabIndex={-1}
            autoComplete='off'
            aria-hidden
            className='hidden'
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </section>
      )}

      {error && (
        <p role='alert' className='rounded-xl bg-red-50 px-4 py-3 text-red-700 ring-1 ring-red-200'>
          {error}
        </p>
      )}

      {itemCount > 0 && (
        <div className='no-print fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur'>
          <div className='mx-auto flex max-w-2xl items-center gap-4'>
            <div className='flex-1 text-sm leading-tight'>
              <p className='font-semibold'>
                {itemCount} article{itemCount > 1 ? 's' : ''} · {formatEuros(priced.totalCents)}
              </p>
              <p className='text-neutral-500'>Commandez avant {cutoff}</p>
            </div>
            {cart.length > 0 && (
              <button type='submit' disabled={submitting} className='btn-primary'>
                {submitting ? 'Envoi…' : 'Commander'}
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className='block'>
      <span className='label'>{label}</span>
      <div className='mt-1'>{children}</div>
      {hint && <span className='mt-1 block text-xs text-neutral-500'>{hint}</span>}
    </label>
  )
}

/** One button per flavor when the product has variants (e.g. "Oasis Pomme"). */
function choices(product: MenuProduct) {
  return product.variants.length
    ? product.variants.map((v) => ({ variant: v, label: `${product.name} ${v}` }))
    : [{ variant: null, label: product.name }]
}

function ProductSection({
  title,
  products,
  onAdd,
}: {
  title: string
  products: MenuProduct[]
  onAdd: (item: CartItem) => void
}) {
  if (products.length === 0) return null
  return (
    <section>
      <h2 className='section-title'>{title}</h2>
      <ul className='mt-3 divide-y divide-neutral-200 rounded-2xl bg-white ring-1 ring-neutral-200'>
        {products.map((p) => (
          <li key={p.id} className='px-4 py-3'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='font-semibold'>
                  {p.name}
                  {p.formulaEligible && <span className='ml-1 text-formule-dark'>*</span>}
                </p>
                {p.description && <p className='text-sm text-neutral-500'>{p.description}</p>}
              </div>
              <p className='shrink-0 font-semibold tabular-nums'>{formatEuros(p.priceCents)}</p>
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              {choices(p).map((c) => (
                <button
                  key={c.label}
                  type='button'
                  className='chip'
                  onClick={() => onAdd({ type: 'produit', productId: p.id, variant: c.variant, quantity: 1 })}
                >
                  + {p.variants.length ? c.variant : 'Ajouter'}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FormuleBuilder({
  sandwiches,
  drinks,
  price,
  onAdd,
}: {
  sandwiches: MenuProduct[]
  drinks: MenuProduct[]
  price: number
  onAdd: (item: CartItem) => void
}) {
  const [sandwichId, setSandwichId] = useState<number | null>(null)
  const [drink, setDrink] = useState<{ id: number; variant: string | null } | null>(null)
  const [added, setAdded] = useState(false)
  if (sandwiches.length === 0 || drinks.length === 0) return null

  const drinkChoices = drinks.flatMap((d) => choices(d).map((c) => ({ ...c, id: d.id })))

  return (
    <section className='rounded-2xl bg-white p-4 ring-2 ring-formule'>
      <div className='flex items-baseline justify-between'>
        <h2 className='section-title text-formule-dark'>Formule</h2>
        <p className='text-xl font-semibold tabular-nums'>{formatEuros(price)}</p>
      </div>
      <p className='text-neutral-600'>Un sandwich* et une boisson au choix.</p>

      <p className='label mt-4'>1. Le sandwich</p>
      <div className='mt-2 flex flex-wrap gap-2'>
        {sandwiches.map((s) => (
          <button
            key={s.id}
            type='button'
            className={`chip ${sandwichId === s.id ? 'chip-formule' : ''}`}
            onClick={() => setSandwichId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <p className='label mt-4'>2. La boisson</p>
      <div className='mt-2 flex flex-wrap gap-2'>
        {drinkChoices.map((c) => (
          <button
            key={c.label}
            type='button'
            className={`chip ${drink?.id === c.id && drink.variant === c.variant ? 'chip-formule' : ''}`}
            onClick={() => setDrink({ id: c.id, variant: c.variant })}
          >
            {c.label}
          </button>
        ))}
      </div>

      <button
        type='button'
        disabled={!sandwichId || !drink}
        className='btn-formule mt-4 w-full'
        onClick={() => {
          if (!sandwichId || !drink) return
          onAdd({ type: 'formule', sandwichId, drinkId: drink.id, drinkVariant: drink.variant, quantity: 1 })
          setSandwichId(null)
          setDrink(null)
          setAdded(true)
          setTimeout(() => setAdded(false), 1500)
        }}
      >
        {added ? 'Ajoutée ✓' : 'Ajouter la formule'}
      </button>
    </section>
  )
}
