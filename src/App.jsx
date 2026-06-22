
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import { ProjectProvider } from '@/context/ProjectContext';
import { useTheme } from '@/hooks/useTheme';
import { useLogoManager } from '@/hooks/useLogoManager';
import MainLayout from '@/layouts/MainLayout';
import HomePage from '@/pages/HomePage';
import InputPage from '@/pages/InputPage';
import AnalysisPage from '@/pages/AnalysisPage';
import ResultsPage from '@/pages/ResultsPage';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import ChatPage from '@/pages/ChatPage';
import FlowDesignerPage from '@/pages/FlowDesignerPage';
import AdminCotizadorPage from '@/pages/AdminCotizadorPage';
import SimulatorsPage from '@/pages/SimulatorsPage';
import RiderSimulatorPage from '@/pages/RiderSimulatorPage';
import DynamicSimulatorBuilder from '@/pages/alpha/simulators/DynamicSimulatorBuilder';
import LMA500Simulator from '@/pages/alpha/simulators/LMA500Simulator';
import SMQSimulator from '@/pages/alpha/simulators/SMQSimulator';
import CarrierSimulator from '@/pages/alpha/simulators/CarrierSimulator';
import ForviaSimulator from '@/pages/alpha/simulators/ForviaSimulator';
import WM500Simulator from '@/pages/alpha/simulators/WM500Simulator';
import WM500SimulatorStable from '@/pages/alpha/simulators/WM500SimulatorStable';
import VerifyPage from '@/pages/VerifyPage';
import AvatarPage from '@/pages/AvatarPage';

import BetaLayout from '@/layouts/BetaLayout';
import BetaDashboard from '@/pages/beta/BetaDashboard';

function RiderSimulatorPageWrapper() {
  const { id } = useParams();
  return <RiderSimulatorPage key={id} />;
}

function AppContent() {
  // Initialize theme and logo
  useTheme();
  useLogoManager();

  return (
    <Routes>
      {/* Pandora Beta System - AHORA COMO MODO DE INICIO POR DEFECTO */}
      <Route path='/' element={<BetaLayout />}>
        <Route index element={<BetaDashboard />} />
      </Route>

      <Route path='/alpha' element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path='analysis-input' element={<InputPage />} />
        <Route path='simulators'>
          <Route index element={<SimulatorsPage />} />
          <Route path='builder' element={<DynamicSimulatorBuilder />} />
          <Route path='lma-500' element={<LMA500Simulator />} />
          <Route path='smq-automatic' element={<SMQSimulator />} />
          <Route path='carrier' element={<CarrierSimulator />} />
          <Route path='forvia' element={<ForviaSimulator />} />
          <Route path='wm-500' element={<WM500Simulator />} />
          <Route path='wm-500-stable' element={<WM500SimulatorStable />} />
          <Route path=':id' element={<RiderSimulatorPageWrapper />} />
        </Route>
        <Route path='analysis' element={<AnalysisPage />} />
        <Route path='avatar' element={<AvatarPage />} />
        <Route path='results' element={<Navigate to="/alpha/avatar" replace />} />
        <Route path='dashboard' element={<DashboardPage />} />
        <Route path='settings' element={<SettingsPage />} />
        <Route path='chat' element={<ChatPage />} />
        <Route path='flow-designer' element={<FlowDesignerPage />} />
        <Route path='admin-cotizador' element={<AdminCotizadorPage />} />
      </Route>

      <Route path='/app/avatar' element={<Navigate to="/alpha/avatar" replace />} />

      {/* Validación PANDORA */}
      <Route path='/verify' element={<VerifyPage />} />

      {/* Redirección de seguridad para compatibilidad */}
      <Route path='/beta' element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { LanguageProvider } from '@/context/LanguageContext';
import { BetaProvider } from '@/context/BetaContext';

function App() {
  return (
    <LanguageProvider>
      <ProjectProvider>
        <BetaProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppContent />
          </BrowserRouter>
        </BetaProvider>
      </ProjectProvider>
    </LanguageProvider>
  );
}

export default App;
