import { InstallBanner } from './install-banner'

/** Install banner of the admin: installs "Suricate Pro", Bruno's app (start page /admin). */
export function AdminInstallBanner() {
  return (
    <InstallBanner
      storageKey='suricate:admin-install-dismissed'
      serviceWorker={{ url: '/admin-sw.js', scope: '/admin' }}
      icon='/admin-app/icon-192.png'
      title='Installer l’appli sur ce téléphone'
      description='L’espace Bruno s’ouvre en un geste depuis l’écran d’accueil.'
    />
  )
}
