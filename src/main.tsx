import '@fontsource/saira-condensed/500.css'
import '@fontsource/saira-condensed/600.css'
import '@fontsource/saira-condensed/700.css'
import '@fontsource/fraunces/500-italic.css'
import '@fontsource-variable/instrument-sans'
import './styles/app.css'
import './styles/screens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useStore } from './store/store'

// console access for power users and the screenshot walkthrough
;(window as unknown as Record<string, unknown>).__wcstore = useStore

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
