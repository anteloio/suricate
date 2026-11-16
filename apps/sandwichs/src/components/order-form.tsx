'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  cartItemKey,
  cartItemSchema,
  MAX_QUANTITY,
  priceCart,
  type CartItem,
  type MenuProduct,
  type PricedLine,
  type PricingRules,
} from '@/lib/cart'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/db/schema'
import { type DeliveryPoint } from '@/lib/delivery-points'
import { formatEuros } from '@/lib/money'
import { addToHistory, ORDER_HISTORY_KEY, parseHistory } from '@/lib/order-history'

type Day = { date: string; label: string }

type Customer = {
  customerName: string
  phone: string
  deliveryPointId: string
  paymentMethod: PaymentMethod | ''
}

const EMPTY_CUSTOMER: Customer = {
  customerName: '',
  phone: '',
  deliveryPointId: '',
  paymentMethod: '',
}

// Returning customers (mostly office workers) find their details and cart pre-filled.
const CUSTOMER_KEY = 'suricate:client'
const CART_KEY = 'suricate:panier'

export function OrderForm({
  menu,
  days,
  rules,
  deliveryPoints,
  cutoff,
  deliveryWindow,
}: {
  menu: MenuProduct[]
  days: Day[]
  rules: PricingRules
  deliveryPoints: DeliveryPoint[]
  cutoff: string
  deliveryWindow: string
}) {
  const router = useRouter()
  const [serviceDate, setServiceDate] = useState(days[0].date)
  const [cart, setCart] = useState<CartItem[]>([])
  // With a single delivery point there is nothing to choose: preselect it.
  const defaultPointId = deliveryPoints.length === 1 ? deliveryPoints[0].id : ''
  const [customer, setCustomer] = useState<Customer>({ ...EMPTY_CUSTOMER, deliveryPointId: defaultPointId })
  const [notes, setNotes] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState<Step>('menu')
  // Details restored from this phone are shown as a summary; a new customer gets the fields.
  const [editingDetails, setEditingDetails] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)

  // Steps live in the URL hash (#panier, #livraison) so the phone's back button goes back a step.
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1)
      setStep(hash === 'panier' || hash === 'livraison' ? hash : 'menu')
      setError(null)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  const goTo = (next: Step) => {
    if (next === step) return
    window.location.hash = next === 'menu' ? '' : next
    formRef.current?.scrollIntoView({ block: 'start' })
  }

  // Restoring from localStorage must happen after hydration (the server has no localStorage).
  useEffect(() => {
    try {
      const savedCustomer = localStorage.getItem(CUSTOMER_KEY)
      if (savedCustomer) {
        // Older saves also hold fields the form no longer asks for (email, address…): keep only ours.
        const saved = JSON.parse(savedCustomer) as Partial<Customer>
        const pointId = deliveryPoints.some((p) => p.id === saved.deliveryPointId)
          ? saved.deliveryPointId!
          : defaultPointId
        const restored: Customer = {
          customerName: typeof saved.customerName === 'string' ? saved.customerName.trim().split(/\s+/)[0] : '',
          phone: typeof saved.phone === 'string' ? saved.phone : '',
          deliveryPointId: pointId,
          paymentMethod: PAYMENT_METHODS.includes(saved.paymentMethod as PaymentMethod)
            ? (saved.paymentMethod as PaymentMethod)
            : '',
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCustomer(restored)
        setEditingDetails(!(restored.customerName && restored.phone && restored.deliveryPointId))
      }
      const savedCart = localStorage.getItem(CART_KEY)
      if (savedCart) {
        const items = JSON.parse(savedCart) as unknown[]
        // Drop items that no longer exist on the menu (or older cart formats).
        setCart(
          items
            .map((item) => cartItemSchema.safeParse(item))
            .filter((r) => r.success)
            .map((r) => r.data)
            .filter((item) => priceCart([item], menu, { ...rules, minOrderCents: 0 }).ok)
        )
      }
    } catch {
      // Corrupted storage: start fresh.
    }
    setLoaded(true)
  }, [menu, rules, deliveryPoints, defaultPointId])

  useEffect(() => {
    if (loaded) localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart, loaded])

  // Delivery details are remembered on this phone as soon as they are typed.
  useEffect(() => {
    if (loaded) localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer))
  }, [customer, loaded])

  // A step past the menu makes no sense with an empty cart (e.g. reloading #livraison after ordering).
  useEffect(() => {
    if (loaded && cart.length === 0 && step !== 'menu') window.location.hash = ''
  }, [loaded, cart.length, step])

  const priced = useMemo(() => priceCart(cart, menu, rules), [cart, menu, rules])
  const itemCount = cart.reduce((n, i) => n + i.quantity, 0)

  const quantities = useMemo(() => new Map(cart.map((i) => [cartItemKey(i), i.quantity])), [cart])

  /** The +/- counters on the menu: the cart only holds products and quantities. */
  const changeQuantity = (productId: number, variant: string | null, delta: number) => {
    setError(null)
    setCart((current) => {
      const key = cartItemKey({ productId, variant })
      const existing = current.find((i) => cartItemKey(i) === key)
      const quantity = Math.max(0, Math.min(MAX_QUANTITY, (existing?.quantity ?? 0) + delta))
      if (!existing) return quantity > 0 ? [...current, { productId, variant, quantity }] : current
      return quantity > 0
        ? current.map((i) => (i === existing ? { ...i, quantity } : i))
        : current.filter((i) => i !== existing)
    })
  }

  const update = <K extends keyof Customer>(key: K, value: Customer[K]) => setCustomer((c) => ({ ...c, [key]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!priced.ok) return setError(priced.error)
    if (!customer.customerName.trim() || !customer.phone.trim() || !customer.deliveryPointId) {
      setEditingDetails(true)
      return setError('Indiquez votre prénom, votre téléphone et le point de livraison.')
    }
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
      const history = parseHistory(localStorage.getItem(ORDER_HISTORY_KEY))
      localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(addToHistory(history, result.code)))
      localStorage.removeItem(CART_KEY)
      router.replace(`/commande/${result.code}?nouvelle=1`)
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.')
      setSubmitting(false)
    }
  }

  const sandwiches = menu.filter((p) => p.category === 'sandwich')
  const drinks = menu.filter((p) => p.category === 'boisson')
  const desserts = menu.filter((p) => p.category === 'dessert')
  const point = deliveryPoints.find((p) => p.id === customer.deliveryPointId)
  const day = days.find((d) => d.date === serviceDate) ?? days[0]

  const lineKey = (l: PricedLine) => `${l.kind}:${l.productId}:${l.variant}:${l.drinkId}:${l.drinkVariant}`
  const formuleLines = priced.lines.filter((l) => l.kind === 'formule')

  return (
    <form ref={formRef} onSubmit={submit} className='mt-6 scroll-mt-4 space-y-8'>
      <Progress step={step} canReview={itemCount > 0} onGo={goTo} />

      {step === 'menu' && (
        <>
          <p className='rounded-xl bg-stone-50 px-4 py-3 text-center text-neutral-700 ring-1 ring-neutral-200'>
            Livraison <strong className='lowercase'>{days[0].label}</strong>
            {days.length > 1 ? ' (ou un autre jour)' : ''}, {deliveryWindow}
          </p>
          {rules.formulePriceCents > 0 && sandwiches.some((p) => p.formulaEligible) && drinks.length > 0 && (
            <p className='rounded-xl bg-white px-4 py-3 text-center text-neutral-700 ring-2 ring-formule'>
              <strong className='text-formule-dark'>Formule {formatEuros(rules.formulePriceCents)}</strong> : un
              sandwich* et une boisson. Ajoutez-les simplement, la remise s’applique toute seule.
            </p>
          )}
          <ProductSection title='Sandwichs' products={sandwiches} quantities={quantities} onChange={changeQuantity} />
          <ProductSection title='Boissons' products={drinks} quantities={quantities} onChange={changeQuantity} />
          <ProductSection title='Desserts' products={desserts} quantities={quantities} onChange={changeQuantity} />
        </>
      )}

      {step === 'panier' && (
        <section className='space-y-4'>
          <h2 className='section-title'>Votre panier</h2>
          <ul className='divide-y divide-neutral-200 rounded-2xl bg-white ring-1 ring-neutral-200'>
            {cart.map((item) => {
              const product = menu.find((p) => p.id === item.productId)
              if (!product) return null
              const name = item.variant ? `${product.name} ${item.variant}` : product.name
              return (
                <li key={cartItemKey(item)} className='flex items-center gap-3 px-4 py-3'>
                  <div className='flex-1'>
                    <p className='font-medium'>
                      {product.name}
                      {item.variant && <span className='text-neutral-500'> · {item.variant}</span>}
                    </p>
                    <p className='text-sm text-neutral-500 tabular-nums'>{formatEuros(product.priceCents)}</p>
                  </div>
                  <Counter
                    name={name}
                    quantity={item.quantity}
                    onChange={(delta) => changeQuantity(item.productId, item.variant ?? null, delta)}
                  />
                </li>
              )
            })}
          </ul>
          <button type='button' className='text-sm font-medium underline' onClick={() => goTo('menu')}>
            + Ajouter d’autres articles
          </button>

          <div className='rounded-2xl bg-white ring-1 ring-neutral-200'>
            {formuleLines.length > 0 && (
              <ul className='border-b border-neutral-200 px-4 py-3 text-formule-dark'>
                {formuleLines.map((l) => (
                  <li key={lineKey(l)}>
                    {l.quantity} × {l.label} à {formatEuros(l.unitPriceCents)}
                  </li>
                ))}
              </ul>
            )}
            <dl className='space-y-1 px-4 py-3'>
              <div className='flex justify-between text-neutral-600'>
                <dt>Sous-total</dt>
                <dd className='tabular-nums'>{formatEuros(priced.subtotalCents)}</dd>
              </div>
              {priced.formulaDiscountCents > 0 && (
                <div className='flex justify-between text-formule-dark'>
                  <dt>Remise formule{priced.formulaCount > 1 ? ` (× ${priced.formulaCount})` : ''}</dt>
                  <dd className='tabular-nums'>− {formatEuros(priced.formulaDiscountCents)}</dd>
                </div>
              )}
              <div className='flex justify-between pt-1 text-lg font-semibold'>
                <dt>Total</dt>
                <dd className='tabular-nums'>{formatEuros(priced.totalCents)}</dd>
              </div>
            </dl>
          </div>
          <p className='text-sm text-neutral-500'>Paiement à la livraison. Livraison offerte.</p>
          {!priced.ok && cart.length > 0 && <p className='text-sm text-amber-700'>{priced.error}</p>}
        </section>
      )}

      {step === 'livraison' && (
        <section className='space-y-5'>
          <h2 className='section-title'>Livraison</h2>

          {days.length > 1 ? (
            <fieldset>
              <legend className='label'>Jour</legend>
              <div className='mt-2 flex flex-wrap gap-2'>
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
            </fieldset>
          ) : null}

          {editingDetails ? (
            <>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='Prénom'>
                  <input
                    className='input'
                    required
                    autoComplete='given-name'
                    value={customer.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                  />
                </Field>
                <Field label='Téléphone' hint='Bruno vous prévient sur WhatsApp à l’arrivée.'>
                  <input
                    className='input'
                    required
                    type='tel'
                    autoComplete='tel'
                    value={customer.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </Field>
              </div>
              <fieldset>
                <legend className='label'>Point de livraison</legend>
                <div className='mt-2 grid gap-2'>
                  {deliveryPoints.map((p) => {
                    const selected = customer.deliveryPointId === p.id
                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 ring-1 ${selected ? 'bg-stone-50 ring-2 ring-neutral-900' : 'bg-white ring-neutral-200 hover:bg-stone-50'}`}
                      >
                        <input
                          type='radio'
                          name='deliveryPoint'
                          required
                          className='mt-1'
                          checked={selected}
                          onChange={() => update('deliveryPointId', p.id)}
                        />
                        <span>
                          <span className='block font-medium'>{p.name}</span>
                          <span className='block text-sm text-neutral-500'>{p.address}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            </>
          ) : (
            // Returning customer: details restored from this phone, one tap to change them.
            <div className='card flex items-start justify-between gap-3'>
              <div>
                <p className='font-semibold'>
                  {customer.customerName} · {customer.phone}
                </p>
                <p className='text-sm text-neutral-600'>{point?.name}</p>
                <p className='text-sm text-neutral-500'>{point?.address}</p>
                <p className='mt-1 text-sm text-neutral-600'>
                  <span className='lowercase'>{day.label}</span>, {deliveryWindow}
                </p>
              </div>
              <button type='button' className='btn-secondary shrink-0' onClick={() => setEditingDetails(true)}>
                Modifier
              </button>
            </div>
          )}

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
              className='input min-h-16'
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
          <div className='mx-auto flex max-w-2xl items-center gap-3'>
            {step !== 'menu' && (
              <button
                type='button'
                className='qty shrink-0'
                aria-label='Étape précédente'
                onClick={() => goTo(step === 'livraison' ? 'panier' : 'menu')}
              >
                ←
              </button>
            )}
            <div className='flex-1 text-sm leading-tight'>
              <p className='font-semibold'>
                {itemCount} article{itemCount > 1 ? 's' : ''} · {formatEuros(priced.totalCents)}
              </p>
              <p className='text-neutral-500'>
                {priced.formulaCount > 0
                  ? `Formule${priced.formulaCount > 1 ? 's' : ''} appliquée${priced.formulaCount > 1 ? 's' : ''} · `
                  : ''}
                Commandez avant {cutoff}
              </p>
            </div>
            {step === 'menu' && (
              <button type='button' className='btn-primary' onClick={() => goTo('panier')}>
                Voir le panier
              </button>
            )}
            {step === 'panier' && (
              <button type='button' className='btn-primary' disabled={!priced.ok} onClick={() => goTo('livraison')}>
                Continuer
              </button>
            )}
            {step === 'livraison' && (
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

const STEPS = [
  { id: 'menu', label: 'Menu' },
  { id: 'panier', label: 'Panier' },
  { id: 'livraison', label: 'Livraison' },
] as const
type Step = (typeof STEPS)[number]['id']

/** "1 Menu · 2 Panier · 3 Livraison": earlier steps can be tapped to go back. */
function Progress({ step, canReview, onGo }: { step: Step; canReview: boolean; onGo: (s: Step) => void }) {
  const current = STEPS.findIndex((s) => s.id === step)
  return (
    <ol className='flex items-center justify-center gap-2 text-sm' aria-label='Étapes de la commande'>
      {STEPS.map((s, i) => {
        const reachable = i < current || (i === 1 && canReview && current > 1)
        return (
          <li key={s.id} className='flex items-center gap-2'>
            {i > 0 && <span className='h-px w-5 bg-neutral-300' aria-hidden />}
            <button
              type='button'
              disabled={!reachable}
              aria-current={i === current ? 'step' : undefined}
              onClick={() => onGo(s.id)}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${i === current ? 'font-semibold text-neutral-900' : i < current ? 'text-neutral-700 underline' : 'text-neutral-400'}`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs ${i <= current ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-500'}`}
              >
                {i + 1}
              </span>
              {s.label}
            </button>
          </li>
        )
      })}
    </ol>
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

/** One counter per flavor when the product has variants (e.g. "Oasis · Cassis"). */
function choices(product: MenuProduct) {
  return product.variants.length ? product.variants : [null]
}

function ProductSection({
  title,
  products,
  quantities,
  onChange,
}: {
  title: string
  products: MenuProduct[]
  quantities: Map<string, number>
  onChange: (productId: number, variant: string | null, delta: number) => void
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
                <p className='mt-1 font-semibold tabular-nums'>{formatEuros(p.priceCents)}</p>
              </div>
              {p.variants.length === 0 && (
                <Counter
                  name={p.name}
                  quantity={quantities.get(cartItemKey({ productId: p.id, variant: null })) ?? 0}
                  onChange={(delta) => onChange(p.id, null, delta)}
                />
              )}
            </div>
            {p.variants.length > 0 && (
              <ul className='mt-2 space-y-2'>
                {choices(p).map((variant) => (
                  <li key={variant} className='flex items-center justify-between gap-4 pl-3'>
                    <span className='text-neutral-700'>{variant}</span>
                    <Counter
                      name={`${p.name} ${variant}`}
                      quantity={quantities.get(cartItemKey({ productId: p.id, variant })) ?? 0}
                      onChange={(delta) => onChange(p.id, variant, delta)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Uber Eats-style counter: a single "+" until the item is in the cart, then − n +. */
function Counter({ name, quantity, onChange }: { name: string; quantity: number; onChange: (delta: number) => void }) {
  if (quantity === 0) {
    return (
      <button type='button' className='qty shrink-0' aria-label={`Ajouter ${name}`} onClick={() => onChange(1)}>
        +
      </button>
    )
  }
  return (
    <div className='flex shrink-0 items-center gap-2'>
      <button type='button' className='qty' aria-label={`Retirer ${name}`} onClick={() => onChange(-1)}>
        −
      </button>
      <span className='w-5 text-center font-semibold tabular-nums' aria-label={`Quantité ${name}`}>
        {quantity}
      </span>
      <button
        type='button'
        className='qty'
        aria-label={`Ajouter ${name}`}
        disabled={quantity >= MAX_QUANTITY}
        onClick={() => onChange(1)}
      >
        +
      </button>
    </div>
  )
}
