import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'

// Safety net: never leave the native splash up if startup fails.
if (Capacitor.isNativePlatform()) import('./lib/native').then((m) => setTimeout(m.hideSplash, 4000))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support for the web/PWA build (the Android app ships its files inside the APK).
if (import.meta.env.PROD && 'serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          sw?.addEventListener('statechange', () => {
            // A new version is ready while an old one controls the page: let the user choose when to reload.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('ashdo:update-ready', { detail: sw }))
            }
          })
        })
      })
      .catch((e) => console.warn('Service worker registration failed', e))
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
  })
}
