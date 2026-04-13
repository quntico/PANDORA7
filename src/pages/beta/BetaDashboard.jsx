import React from 'react';
import BetaChat from '@/components/beta/BetaChat';
import BetaAdmin from '@/components/beta/BetaAdmin';
import ProjectVault from '@/components/beta/ProjectVault';
import { useBeta } from '@/context/BetaContext';
import { Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function BetaDashboard() {
  const { loading, viewMode } = useBeta();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Cpu className="w-12 h-12 text-neon-cyan animate-pulse" />
            <div className="absolute inset-0 bg-neon-cyan/20 blur-2xl animate-pulse" />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-black text-white tracking-[4px] uppercase">CARGANDO SISTEMA BETA</h2>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 animate-bounce">
              Sincronizando con Supabase Memory...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 bg-[#0A0A0A] overflow-hidden">
      <AnimatePresence mode="wait">

        {viewMode === 'sandbox' && (
          <motion.div
            key="sandbox"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex-1 flex justify-center bg-[#0A0A0A] relative"
          >
            <div className="w-full max-w-[1400px] flex flex-col h-full mx-auto shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <BetaChat />
            </div>
            <div className="absolute top-4 right-12 flex items-center gap-4 pointer-events-none opacity-50">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Sincronizado</span>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'circOut' }}
            className="flex-1 bg-[#050505]"
          >
            <BetaAdmin />
          </motion.div>
        )}

        {viewMode === 'vault' && (
          <motion.div
            key="vault"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex-1 bg-[#050505]"
          >
            <ProjectVault />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default BetaDashboard;
