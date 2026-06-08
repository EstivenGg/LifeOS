import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { seedDatabase } from './data/db/seed'
import { ThemeProvider } from './context/ThemeContext'
import { SectionPrefsProvider } from './context/SectionPrefsContext'

async function bootstrap() {
  try {
    await seedDatabase()
  } catch (error) {
    console.error('LifeOS seed failed', error)
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <SectionPrefsProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </SectionPrefsProvider>
      </ThemeProvider>
    </React.StrictMode>,
  )
}

void bootstrap()
