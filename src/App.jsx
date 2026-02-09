
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function AppContent() {
  // Initialize theme and logo
  useTheme();
  useLogoManager();

  return (
    <Routes>
      <Route path='/' element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path='analysis-input' element={<InputPage />} />
        <Route path='analysis' element={<AnalysisPage />} />
        <Route path='results' element={<ResultsPage />} />
        <Route path='dashboard' element={<DashboardPage />} />
        <Route path='settings' element={<SettingsPage />} />
        <Route path='chat' element={<ChatPage />} />
        <Route path='flow-designer' element={<FlowDesignerPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppContent />
      </BrowserRouter>
    </ProjectProvider>
  );
}

export default App;
