import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function initializeApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

initializeApp()

// Auto-unregister any MSW service workers in development when mocks are disabled
if (import.meta.env.DEV && (import.meta.env.VITE_ENABLE_MOCK_API === 'false' || import.meta.env.VITE_ENABLE_MOCK_API === false)) {
  if ('serviceWorker' in navigator) {
    // eslint-disable-next-line no-console
    console.info('[startup] Ensuring no mock service worker is registered');
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => {
        try {
          reg.unregister().then((ok) => {
            // eslint-disable-next-line no-console
            if (ok) console.info('[startup] Unregistered service worker:', reg.scope);
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[startup] Failed to unregister service worker', e);
        }
      });
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[startup] Error reading service worker registrations', e);
    });
  }
}
