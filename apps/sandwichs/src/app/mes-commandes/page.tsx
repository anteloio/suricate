import Link from 'next/link'
import { Logo } from '@/components/logo'
import { OrderHistory } from '@/components/order-history'

export const metadata = { title: 'Mes commandes · Suricate' }

export default function MyOrdersPage() {
  return (
    <main className='mx-auto max-w-xl px-4 py-8'>
      <div className='text-center'>
        <Logo className='mx-auto h-12 w-auto' />
        <h1 className='mt-2 font-serif text-2xl tracking-[0.2em] text-brand uppercase'>Mes commandes</h1>
        <p className='mt-1 text-sm text-neutral-500'>Les commandes passées depuis ce téléphone.</p>
      </div>
      <OrderHistory />
      <p className='mt-8 text-center'>
        <Link href='/' className='btn-primary inline-block'>
          Commander
        </Link>
      </p>
    </main>
  )
}
