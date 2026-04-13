import React from 'react';
import { 
  Share2, Download, ExternalLink, Activity, 
  ChevronRight, ArrowRightCircle, LogOut,
  Monitor, Settings, ShieldCheck, FolderOpen
} from 'lucide-react';
import { useBeta } from '@/context/BetaContext';
import { useProject } from '@/context/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

function BetaHeader() {
  const { activeProject, viewMode, setViewMode } = useBeta();
  const { setAppMode } = useProject();
  const navigate = useNavigate();

  const handleExit = () => {
    setAppMode('normal');
    navigate('/alpha');
  };

  return (
    <header className="h-[72px] bg-[#050505] border-b border-[#151515] flex items-center justify-between px-8 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-center shadow-inner group">
            <Activity className="w-5 h-5 text-neon-cyan group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white tracking-widest flex items-center gap-2">
              {activeProject?.name || "Cargando Proyecto..."}
            </h1>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[2px] mt-0.5">
              MODO: <span className={cn(viewMode === 'sandbox' ? "text-neon-cyan" : "text-neon-purple")}>
                {viewMode === 'sandbox' ? 'SANDBOX EJECUTIVO' : 'SISTEMA DE ADMINISTRACIÓN'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Central Navigation Toggle */}
      <div className="flex items-center bg-[#0A0A0A] rounded-[20px] border border-[#1A1A1A] p-1.5 gap-2 shadow-inner">
        <button 
          onClick={() => setViewMode('sandbox')}
          className={cn(
            "flex items-center gap-3 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all",
            viewMode === 'sandbox' 
              ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 shadow-glow-sm" 
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Monitor className="w-4 h-4" />
          Sandbox
        </button>
        <button 
          onClick={() => setViewMode('admin')}
          className={cn(
            "flex items-center gap-3 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all",
            viewMode === 'admin' 
              ? "bg-neon-purple/10 text-neon-purple border border-neon-purple/30 shadow-glow-sm" 
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Settings className="w-4 h-4" />
          Administración
        </button>
        <button 
          onClick={() => setViewMode('vault')}
          className={cn(
            "flex items-center gap-3 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all",
            viewMode === 'vault' 
              ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 shadow-glow-sm" 
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Bóveda
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A0A0A] border border-[#151515]">
           <span className="w-2 h-2 rounded-full bg-green-500 shadow-glow-sm animate-pulse" />
           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">IA Sincronizada</span>
        </div>

        <button 
          onClick={handleExit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-neon-cyan/5 text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/50 hover:bg-neon-cyan/10 transition-all group"
        >
          <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>MODO ALPHA</span>
        </button>
      </div>
    </header>
  );
}

export default BetaHeader;

