import Link from 'next/link'

export default function NotFound() {
  return (
    <main className='mx-auto max-w-xl px-4 py-24 text-center'>
      <p className='text-lg font-medium'>Page introuvable.</p>
      <Link href='/' className='btn-primary mt-6 inline-block'>
        Retour au menu
      </Link>
    </main>
  )
}
