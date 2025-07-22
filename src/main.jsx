import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
// import { Button } from "flowbite-react";
import MainNav from './assets/components/MainNavigation.jsx';
import CostumeDetailPage from './pages/CostumeDetailPage.jsx';
import SceneOverviewPage from './pages/SceneOverviewPage.jsx';
import ShootingDayDetailPage from './pages/ShootingDayDetailPage.jsx';
import CostumeOverviewPage from './pages/CostumeOverviewPage.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MainNav />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="costumes" element={<CostumeOverviewPage />} />
        <Route path="costumes/:id" element={<CostumeDetailPage />} />
        <Route path="scene-overview" element={<SceneOverviewPage />} />
        <Route path="shootingday" element={<ShootingDayDetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
