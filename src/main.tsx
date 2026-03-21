import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { seedDatabase } from './data/db/seed'
import { ThemeProvider } from './context/ThemeContext'
import { SectionPrefsProvider } from './context/SectionPrefsContext'

seedDatabase()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SectionPrefsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SectionPrefsProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
