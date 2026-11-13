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

// Unconditionally unregister any legacy MSW / service workers so latest backend APIs are always used directly
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.VITE_ENABLE_MOCK_API !== 'true') {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      reg.unregister().then((ok) => {
        if (ok) console.info('[startup] Unregistered legacy service worker:', reg.scope);
      });
    });
  }).catch((e) => {
    console.warn('[startup] Error checking service workers:', e);
  });
}
