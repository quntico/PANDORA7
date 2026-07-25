
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
import DynamicSimulatorBuilder from '@/pages/alpha/simulators/DynamicSimulatorBuilder';
import LMA500Simulator from '@/pages/alpha/simulators/LMA500Simulator';
import SMQSimulator from '@/pages/alpha/simulators/SMQSimulator';
import CarrierSimulator from '@/pages/alpha/simulators/CarrierSimulator';
import ForviaSimulator from '@/pages/alpha/simulators/ForviaSimulator';
import WM500Simulator from '@/pages/alpha/simulators/WM500Simulator';
import WM500SimulatorStable from '@/pages/alpha/simulators/WM500SimulatorStable';
import MolexSimulator from '@/pages/alpha/simulators/MolexSimulator';
import DHLSimulator from '@/pages/alpha/simulators/DHLSimulator';
import DHLAdvancedSimulator from '@/pages/alpha/simulators/DHLAdvancedSimulator';
import PanalCamaSimulator from '@/pages/alpha/simulators/PanalCamaSimulator';
import VerifyPage from '@/pages/VerifyPage';
import AvatarPage from '@/pages/AvatarPage';

import BetaLayout from '@/layouts/BetaLayout';
import BetaDashboard from '@/pages/beta/BetaDashboard';

function SimulatorPageWrapper() {
  const { id } = useParams();
  const [simulatorType, setSimulatorType] = React.useState('rider');

  React.useEffect(() => {
    const saved = localStorage.getItem('pandora_simulators');
    if (saved) {
      try {
        const simulators = JSON.parse(saved);
        const found = simulators.find(s => s.id === id);
        if (found) {
          if (id === 'sim_1784273988247') {
            setSimulatorType('dhl');
          } else {
            setSimulatorType(found.type || found.id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [id]);

  React.useEffect(() => {
    if (!id || id === simulatorType) return;

    const originalGetItem = localStorage.getItem;
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    const normalizedSrc = simulatorType.replace('-', '').toLowerCase();
    const normalizedDest = id.toLowerCase();

    localStorage.getItem = function (key) {
      if (typeof key === 'string') {
        let redirectedKey = key;
        if (key.toLowerCase().includes(normalizedSrc)) {
          const index = key.toLowerCase().indexOf(normalizedSrc);
          redirectedKey = key.substring(0, index) + normalizedDest + key.substring(index + normalizedSrc.length);
        } else if (key.toLowerCase().includes(simulatorType.toLowerCase())) {
          const index = key.toLowerCase().indexOf(simulatorType.toLowerCase());
          redirectedKey = key.substring(0, index) + normalizedDest + key.substring(index + simulatorType.length);
        }
        return originalGetItem.call(localStorage, redirectedKey);
      }
      return originalGetItem.call(localStorage, key);
    };

    localStorage.setItem = function (key, value) {
      if (typeof key === 'string') {
        let redirectedKey = key;
        if (key.toLowerCase().includes(normalizedSrc)) {
          const index = key.toLowerCase().indexOf(normalizedSrc);
          redirectedKey = key.substring(0, index) + normalizedDest + key.substring(index + normalizedSrc.length);
        } else if (key.toLowerCase().includes(simulatorType.toLowerCase())) {
          const index = key.toLowerCase().indexOf(simulatorType.toLowerCase());
          redirectedKey = key.substring(0, index) + normalizedDest + key.substring(index + simulatorType.length);
        }
        return originalSetItem.call(localStorage, redirectedKey, value);
      }
      return originalSetItem.call(localStorage, key, value);
    };

    localStorage.removeItem = function (key) {
      if (typeof key === 'string') {
        let redirectedKey = key;
        if (key.toLowerCase().includes(normalizedSrc)) {
          const index = key.toLowerCase().indexOf(normalizedSrc);
          redirectedKey = key.substring(0, index) + normalizedDest + key.substring(index + normalizedSrc.length);
        } else if (key.toLowerCase().includes(simulatorType.toLowerCase())) {
          const index = key.toLowerCase().indexOf(simulatorType.toLowerCase());
          redirectedKey = key.substring(0, index) + normalizedDest + key.substring(index + simulatorType.length);
        }
        return originalRemoveItem.call(localStorage, redirectedKey);
      }
      return originalRemoveItem.call(localStorage, key);
    };

    return () => {
      localStorage.getItem = originalGetItem;
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, [id, simulatorType]);

  const normType = (simulatorType || '').toLowerCase();

  if (normType.includes('lma-500')) {
    return <LMA500Simulator key={id} />;
  } else if (normType.includes('smq-automatic') || normType.includes('smq')) {
    return <SMQSimulator key={id} />;
  } else if (normType.includes('carrier')) {
    return <CarrierSimulator key={id} />;
  } else if (normType.includes('forvia')) {
    return <ForviaSimulator key={id} />;
  } else if (normType.includes('wm-500')) {
    return <WM500Simulator key={id} />;
  } else if (normType.includes('molex')) {
    return <MolexSimulator key={id} />;
  } else if (normType.includes('panal-cama') || normType.includes('panal')) {
    return <PanalCamaSimulator key={id} />;
  } else if (normType.includes('dhl')) {
    return <DHLAdvancedSimulator key={id} />;
  } else {
    // Todos los clones por defecto heredan la estructura limpia de DHLAdvancedSimulator
    return <DHLAdvancedSimulator key={id} />;
  }
}

function AppContent() {
  // Initialize theme and logo
  useTheme();
  useLogoManager();

  return (
    <Routes>
      {/* Pandora Main System (Soporta / y /alpha/*) */}
      <Route path='/' element={<MainLayout />}>
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
          <Route path='molex' element={<MolexSimulator />} />
          <Route path='dhl' element={<DHLAdvancedSimulator />} />
          <Route path='panal-cama' element={<PanalCamaSimulator />} />
          <Route path=':id' element={<SimulatorPageWrapper />} />
        </Route>
        <Route path='analysis' element={<AnalysisPage />} />
        <Route path='avatar' element={<AvatarPage />} />
        <Route path='results' element={<Navigate to="/avatar" replace />} />
        <Route path='dashboard' element={<DashboardPage />} />
        <Route path='settings' element={<SettingsPage />} />
        <Route path='chat' element={<ChatPage />} />
        <Route path='flow-designer' element={<FlowDesignerPage />} />
        <Route path='admin-cotizador' element={<AdminCotizadorPage />} />
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
          <Route path='molex' element={<MolexSimulator />} />
          <Route path='dhl' element={<DHLAdvancedSimulator />} />
          <Route path='panal-cama' element={<PanalCamaSimulator />} />
          <Route path=':id' element={<SimulatorPageWrapper />} />
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

      {/* Pandora Beta System */}
      <Route path='/beta' element={<BetaLayout />}>
        <Route index element={<BetaDashboard />} />
      </Route>

      <Route path='/app/avatar' element={<Navigate to="/avatar" replace />} />

      {/* Validación PANDORA */}
      <Route path='/verify' element={<VerifyPage />} />
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
