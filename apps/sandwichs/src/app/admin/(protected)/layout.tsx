import { AdminShell } from '@/components/admin-shell'
import { InstallBanner } from '@/components/install-banner'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <AdminShell>
      <InstallBanner />
      {children}
    </AdminShell>
  )
}
