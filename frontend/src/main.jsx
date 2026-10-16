import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initClientHardening } from './services/clientHardening'

// Initialize anti-tamper, right-click disabling, and DevTools inspection guards
initClientHardening();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
