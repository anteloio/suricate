import Image from 'next/image'
import Link from 'next/link'

export function Logo({ href = '/', className = 'h-14 w-auto' }: { href?: string; className?: string }) {
  return (
    <Link href={href} className='inline-block'>
      <Image src='/suricate.png' alt='Suricate' width={936} height={326} priority className={`${className}`} />
    </Link>
  )
}
