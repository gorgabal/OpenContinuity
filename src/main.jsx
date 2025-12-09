import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// import { Button } from "flowbite-react";
import MainNav from './assets/components/MainNavigation.jsx';
import { DatabaseSyncAppwrite } from './services/database.js'; // DEBUG: Remove this line
import CostumeDetailPage from './pages/CostumeDetailPage.jsx';
import SceneOverviewPage from './pages/SceneOverviewPage.jsx';
import SceneDetailPage from './pages/SceneDetailPage.jsx';
import ShootingDayDetailPage from './pages/ShootingDayDetailPage.jsx';
import CostumeOverviewPage from './pages/CostumeOverviewPage.jsx';
import CharacterOverviewPage from './pages/CharacterOverviewPage.jsx';
import CharacterDetailPage from './pages/CharacterDetailPage.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <div style={{
        backgroundColor: '#dc2626',
        color: 'white',
        padding: '12px 20px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        this app is in active development. ANY DATA ENTERED WILL BE LOST. this is a testing environment
      </div>
      {/* DEBUG: Remove this button */}
      <div style={{
        padding: '12px 20px',
        textAlign: 'center',
        backgroundColor: '#f3f4f6',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button 
          onClick={() => {
            console.log('DatabaseSyncAppwrite button clicked');
            DatabaseSyncAppwrite();
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          [DEBUG] Sync Database with Appwrite
        </button>
      </div>
      {/* DEBUG: Remove until here */}
      <MainNav />
      <Routes>
        <Route path="/" element={<Navigate to="/costumes" replace />} />
        <Route path="costumes" element={<CostumeOverviewPage />} />
        <Route path="costumes/:id" element={<CostumeDetailPage />} />
        <Route path="characters" element={<CharacterOverviewPage />} />
        <Route path="characters/:id" element={<CharacterDetailPage />} />
        <Route path="scene-overview" element={<SceneOverviewPage />} />
        <Route path="scene/:id" element={<SceneDetailPage />} />
        <Route path="shootingday/:id" element={<ShootingDayDetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
