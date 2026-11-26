import { AdminShell } from '@/components/admin-shell'
import { AdminInstallBanner } from '@/components/admin-install-banner'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <AdminShell>
      <AdminInstallBanner />
      {children}
    </AdminShell>
  )
}
