import { getMenu, getSettings } from '@/lib/queries'
import { formatEuros } from '@/lib/money'
import { NewProductButton, ProductEditor } from './product-form'

const SECTIONS = [
  { category: 'sandwich', title: 'Sandwichs' },
  { category: 'boisson', title: 'Boissons' },
  { category: 'dessert', title: 'Desserts' },
] as const

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu({ includeInactive: true }), getSettings()])
  return (
    <main className='space-y-8'>
      <div>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-2xl font-semibold'>Menu</h1>
          <NewProductButton />
        </div>
        <p className='mt-1 text-neutral-600'>
          Formule à {formatEuros(settings.formulePriceCents)} (prix modifiable dans Réglages) : un sandwich et une
          boisson, appliquée toute seule quand elle fait baisser le prix. Les modifications sont enregistrées toutes
          seules. Désactivez « en vente » pour retirer un produit sans le supprimer.
        </p>
      </div>
      {SECTIONS.map((s) => (
        <section key={s.category}>
          <h2 className='section-title'>{s.title}</h2>
          <div className='mt-3 space-y-3'>
            {menu
              .filter((p) => p.category === s.category)
              .map((p) => (
                <ProductEditor key={p.id} product={p} />
              ))}
          </div>
        </section>
      ))}
    </main>
  )
}
