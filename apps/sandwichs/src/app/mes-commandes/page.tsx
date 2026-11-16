import Link from 'next/link'
import { OrderHistory } from '@/components/order-history'
import { PageTitle } from '@/components/page-title'

export const metadata = { title: 'Mes commandes · Suricate' }

export default function MyOrdersPage() {
  return (
    <main className='mx-auto max-w-2xl px-4 pt-6 pb-12'>
      <PageTitle title='Mes commandes' subtitle='Les commandes passées depuis ce téléphone.' />
      <OrderHistory />
      <p className='mt-8 text-center'>
        <Link href='/' className='btn-primary inline-block'>
          Nouvelle commande
        </Link>
      </p>
    </main>
  )
}
