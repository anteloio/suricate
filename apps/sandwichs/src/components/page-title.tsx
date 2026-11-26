/** Title block under the site header, same on every customer page. */
export function PageTitle({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className='text-center'>
      <h1 className='font-serif text-2xl tracking-[0.2em] text-brand uppercase'>{title}</h1>
      {subtitle && <p className='mt-2 text-neutral-600'>{subtitle}</p>}
    </div>
  )
}
