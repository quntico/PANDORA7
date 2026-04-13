import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useProject } from '@/context/ProjectContext';
import { BetaProvider } from '@/context/BetaContext';
import BetaSidebar from '@/components/beta/BetaSidebar';
import BetaHeader from '@/components/beta/BetaHeader';

function BetaLayout() {
  // Ahora es la vista por defecto, no necesita redirección inversa

  return (
    <BetaProvider>
      <div className="flex h-screen w-full bg-[#050505] text-[#E0E0E0] overflow-hidden">
        {/* Sidebar Izquierda */}
        <BetaSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Superior */}
          <BetaHeader />

          {/* Área Principal de Contenido */}
          <main className="flex-1 min-h-0 relative">
            <Outlet />
          </main>
        </div>
      </div>
    </BetaProvider>
  );
}

export default BetaLayout;
