import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// import { Button } from "flowbite-react";
import MainNav from './assets/components/MainNavigation.jsx';
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
