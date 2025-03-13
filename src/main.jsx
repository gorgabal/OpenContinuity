import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import './index.css'
import App from './App.jsx'
import { Button } from "flowbite-react";
import QuickActionSidebar from './components/QuickActionSidebar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QuickActionSidebar />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
