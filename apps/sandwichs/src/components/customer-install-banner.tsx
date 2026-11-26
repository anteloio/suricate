import { InstallBanner } from './install-banner'

/** Install banner of the customer site: installs "Suricate", the app to order sandwiches. */
export function CustomerInstallBanner() {
  return (
    <InstallBanner
      storageKey='suricate:client-install-dismissed'
      serviceWorker={{ url: '/client-sw.js', scope: '/' }}
      icon='/client-app/icon-192.png'
      title='Installez l’appli pour commander plus vite'
      description='Suricate s’ouvre en un geste depuis l’écran d’accueil de votre téléphone.'
    />
  )
}
