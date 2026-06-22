import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useProject } from '@/context/ProjectContext';
import { BetaProvider } from '@/context/BetaContext';
import { useBeta } from '@/context/BetaContext';
import BetaSidebar from '@/components/beta/BetaSidebar';
import BetaHeader from '@/components/beta/BetaHeader';

function BetaLayoutInner() {
  const { focusMode } = useBeta();

  return (
    <div className="flex h-screen w-full bg-[#050505] text-[#E0E0E0] overflow-hidden">
      {/* Sidebar — oculta en focusMode */}
      <div className={`transition-all duration-300 ${focusMode ? 'w-0 overflow-hidden opacity-0' : ''}`}>
        <BetaSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior — siempre visible */}
        <BetaHeader />

        {/* Área Principal — colapsa en focusMode */}
        <main className={`flex-1 min-h-0 relative transition-all duration-300 ${focusMode ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function BetaLayout() {
  return <BetaLayoutInner />;
}

export default BetaLayout;
