import { getSettings } from '@/lib/queries'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const s = await getSettings()
  const hh = String(Math.floor(s.cutoffMinutes / 60)).padStart(2, '0')
  const mm = String(s.cutoffMinutes % 60).padStart(2, '0')
  return (
    <main>
      <h1 className='text-2xl font-semibold'>Réglages</h1>
      <SettingsForm
        values={{
          cutoff: `${hh}:${mm}`,
          deliveryWindow: s.deliveryWindow,
          minOrder: (s.minOrderCents / 100).toFixed(2).replace('.', ','),
          formulePrice: (s.formulePriceCents / 100).toFixed(2).replace('.', ','),
        }}
      />
    </main>
  )
}
